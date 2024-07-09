const { GoogleGenerativeAI } = require('@google/generative-ai')
const ApiError = require('../utils/apiError')
const httpStatus = require('http-status')
const { calculateDailyNutrition, calculateProgressNutrition } = require('../utils/nutritionUtils')
const prisma = require('../../prisma/index')
const config = require('../config/config')
const { dayChecker } = require('../utils/dateUtils')
const apiKey = config.gemini.key
const genAi = new GoogleGenerativeAI(apiKey)

const textTracker = async (foodName) => {
    return new Promise(async (resolve, reject) => {
        const model = genAi.getGenerativeModel({model: 'gemini-1.5-flash'})
        const prompt = `analisis kandungan nutrisi dari makanan ${foodName} dengan nilai tetap (tanpa menggunakan rentang) dan tanpa menggunakan satuan (misalnya gram, kkal, dll) hanya gunakan angka total nutrisi yang terkandung. Jika ada yang tidak punya nilai isi dengan 0. jika responsenya berisi lebih dari 1 makanan, kirim hanya makanan kesatu saja.  
        kirim response dengan format string persis seperti dibawah ini tanpa tambahan apapun. jangan pernah kirim dalam format json, harus dikirim dalam format string. your entire response/output is going to consist of a single string object {}, and you will NOT wrap it within JSON md markers
        {
            "foodName": "{food_name_fill with (saya tidak mempunyai informasi mengenai makanan bernama ${foodName}) jika anda tidak punya informasi makanan ${foodName}}",
            "foodInformation": "{food_information_dalambahasaindonesia__minimal 80 karakter_maksimal 100 karakter}",
            "calorie": "{calorie_count_kkal}",
            "sugar": "{sugar_content_grams}",
            "carbohydrate": "{carbohydrate_content_grams}",
            "fat": "{fat_content_grams}",
            "protein": "{protein_content_grams}"
        }
        `
        try {
            const result = await model.generateContent(prompt)
            const response = await result.response.text()
            console.log(response)
            const food = JSON.parse(response)
            food.calorie = parseFloat(food.calorie)
            food.sugar = parseFloat(food.sugar)
            food.carbohydrate = parseFloat(food.carbohydrate)
            food.fat = parseFloat(food.fat)
            food.protein = parseFloat(food.protein)
            return resolve(food)
        } catch (err) {
            return reject(err)
        }
    }) 
}

const nutritionTracker = async (body, userId) => {

    try {
        const nutrition = await prisma.nutrition.findFirst({
            where: {
                userId: userId
            }
        })
    
        const userProfile = await prisma.userProfile.findFirst({
            where: {
                userId: userId
            }
        })
    
        const today = dayChecker(nutrition.updatedAt)
        if(!today){
    
            const resetNutrition = calculateDailyNutrition(userProfile)
    
            await prisma.nutrition.update({
                where: {
                    userId: userId
                },
                data: {
                    ...resetNutrition
                }
            })
        }
        
        const food = await textTracker(body.foodName)
        if(food){
            const nutrition = await prisma.nutrition.findFirst({
                where: {
                    userId: userId
                }
            })
    
            const { foodName, foodInformation, calorie, sugar, carbohydrate, fat, protein } = food
            const updateNutrition = await prisma.nutrition.update({
                where: {
                    userId: userId
                },
                data:{
                    dailyCalorie: nutrition.dailyCalorie - calorie,
                    dailySugar: nutrition.dailySugar - sugar,
                    dailyCarbohydrate: nutrition.dailyCarbohydrate - carbohydrate,
                    dailyFat: nutrition.dailyFat - fat,
                    dailyProtein: nutrition.dailyProtein - protein
                }
            })
    
            await prisma.history.create({
                data: {
                    userId: userId,
                    foodName: foodName,
                    foodInformation: foodInformation,
                    totalCalorie: calorie,
                    totalSugar: sugar,
                    totalCarbohydrate: carbohydrate,
                    totalFat: fat,
                    totalProtein: protein
                }
            })
    
            const resultData = {
                foodInfo: food,
                progressNutrition: calculateProgressNutrition(userProfile, updateNutrition)
            }
    
            return resultData
        }
    } catch (error) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error)
    }
   
}

module.exports = {
    textTracker,
    nutritionTracker
}