module.exports = (app) => {
    var orderModule = require('../module/order_module')();
    //START OF API FOR PROCESS ORDER DETAILS 
    //Response: status, message,discountAmount,finalPrice,totalEarnedPoints
    //functions:createPointsDetails
    //Params:orderId,redeemedPoints,countryCode,pointSource
    app.post('/api/processorder', function (req, res) {
        try {
            if (!req.body.orderId) {
                res.status(400).json({ status: false, message: "orderId parameter is missing" });
                return;
            }
            if (!req.body.redeemedPoints) {
                res.status(400).json({ status: false, message: "redeemedPoints parameter is missing" });
                return;
            }
            if (!req.body.countryCode) {
                res.status(400).json({ status: false, message: "countryCode parameter is missing" });
                return;
            }
            if (!req.body.pointSource) {
                res.status(400).json({ status: false, message: "pointSource parameter is missing" });
                return;
            }
            const { redeemedPoints, pointSource, orderId } = req.body
            const upperCaseCountrycode = req.body.countryCode.toUpperCase();
            // ON ORDER PROCESS NEED TO CREATE POINTS DETAILS
            orderModule.createPointsDetails(orderId,
                redeemedPoints,
                pointSource, upperCaseCountrycode,
                function (error, message, discountAmount, finalPrice, totalEarnedPoints) {
                    if (error) {
                        res.status(500).json({
                            status: false,
                            message: message,
                            discountAmount: parseFloat(discountAmount).toFixed(2),
                            finalPrice: parseFloat(finalPrice).toFixed(2),
                            totalEarnedPoints: totalEarnedPoints
                        })
                    }
                    else {
                        res.status(200).json({
                            status: true,
                            message: message,
                            discountAmount: parseFloat(discountAmount).toFixed(2),
                            finalPrice: parseFloat(finalPrice).toFixed(2),
                            totalEarnedPoints: totalEarnedPoints
                        })
                    }
                })
        }
        catch (er) {
            res.status(500).json({ status: false, message: er });
        }
    });
    //END OF API FOR PROCESS ORDER DETAILS 
    //Start To get the points earned after successfully deliver
    //Params:orderId
    app.post('/api/pointsupdate', function (req, res) {
        try {
            if (!req.body.orderId) {
                res.status(400).json({ status: false, message: "orderId parameter is missing" });
                return;
            }
            orderModule.pointsupdate(req.body.orderId,
                function (error, message) {
                    if (error) {
                        res.status(200).json({
                            status: false,
                            message: message,
                        })
                    }
                    else {
                        res.status(200).json({
                            status: true,
                            message: message,
                        })
                    }
                })
        }
        catch (er) {
            res.status(500).json({ status: false, message: er });
        }
    })
    //Eng To get the points earned
};
