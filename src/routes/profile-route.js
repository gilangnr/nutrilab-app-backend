const express = require('express')
const profileController = require('../controllers/profile-controller')
const router = express.Router()

router  
    .route('/').post(profileController.createProfile)

router  
    .route('/nutrition/:userId').get(profileController.getTotalNutrition)

router
    .route('/nutrition/progress/:userId').get(profileController.getProgressNutrition)

module.exports = router