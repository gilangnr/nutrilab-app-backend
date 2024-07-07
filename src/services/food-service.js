const { GoogleGenerativeAI } = require('@google/generative-ai')
const ApiError = require('../utils/apiError')
const httpStatus = require('http-status')
const config = require('../config/config')
const apiKey = config.gemini.key
const genAi = new GoogleGenerativeAI(apiKey)

const foodTracker = async (body) => {
    return new Promise((resolve, reject) => {
        const model = genAi.getGenerativeModel({model: 'gemini-1.5-flash'})
        const prompt = `dari makanan ${body.foodName} analisis kandungan nutrisinya dengan nilai tetap (tanpa menggunakan rentang) dan tanpa menggunakan satuan (misalnya gram, kkal, dll) hanya gunakan angka total nutrisi yang terkandung. Jika ada yang tidak punya nilai isi dengan 0, 
        kirim response dengan format string persis seperti dibawah ini tanpa tambahan apapun
        {
            "foodName": "{food_name}",
            "foodInformation": "{food_information_dalambahasaindonesia_minimal25kata_maksimal30kata}",
            "calorie": "{calorie_count_kkal}",
            "sugar": "{sugar_content_grams}",
            "carbohydrate": "{carbohydrate_content_grams}"
            "fat": "{fat_content_grams}"
            "protein": "{protein_content_grams}"
        }
        `
        return model.generateContent(prompt)
            .then(res => res.response)
            .then(res => res.text())
            .then(res => resolve(JSON.parse(res)))
            .catch(err => reject(err))
    }) 
}

module.exports = {
    foodTracker
}