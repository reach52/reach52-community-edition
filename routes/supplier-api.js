module.exports = (app) => {
    var supplierModule = require('../module/supplier_module')();
    //START OF API FOR ADD SUPPLIER DETAILS 
    //Params: supplierName,isoCountry,userId
    //Response: status, message,supplierId,supplierCode
    //Functions:addSupplier
    app.post('/api/add/supplier', function (req, res) {
        try {
            if (!req.body.supplierName) {
                res.status(400).json({ status: false, message: "supplierName parameter is missing" });
                return;
            }
            if (!req.body.isoCountry) {
                res.status(400).json({ status: false, message: "isoCountry parameter is missing" });
                return;
            }
            if (!req.body.userId) {
                res.status(400).json({ status: false, message: "userId parameter is missing" });
                return;
            }
            if (!req.body.supplierCode) {
                res.status(400).json({ status: false, message: "supplierCode parameter is missing" });
                return;
            }
            const supplierData = {
                supplierName:
                {
                    eng: req.body.supplierName
                },
                //supplierName: req.body.supplierName,
                supplierCode: req.body.supplierCode,
                isoCountry: req.body.isoCountry.toUpperCase(),
                catalogTags: req.body.catalogTags,
                contact: {
                    address: {
                        addressLine1: req.body.addressLine1,
                        addressLine2: req.body.addressLine1,
                        city: req.body.city,
                        country: req.body.country,
                        district: req.body.district,
                        isoCountry: req.body.isoCountry.toUpperCase(),
                        postalCode: req.body.postalCode,
                        directions: req.body.directions,
                        landmark: req.body.landmark,
                        region: req.body.region,
                        town: req.body.town,
                        zip: req.body.zip,
                    },
                    email: req.body.email,
                    phone: req.body.phone
                },
                deliveryFee: parseFloat(req.body.deliveryFee).toFixed(2),
                usdPrice: parseFloat(req.body.usdPrice).toFixed(2),
                lastProductSeq: req.body.lastProductSeq,
                createdBy: {
                    userId: req.body.userId,
                    utcDatetime: new Date()
                },
                updatedBy: {
                    userId: req.body.userId,
                    utcDatetime: new Date()
                },
                timestamp: new Date()
            };
            // SAVE SUPPLIER DATA IN SUPPLIER COLLECTION BY ADD SUPPLIER COLLECTION
            supplierModule.addSupplier(supplierData,
                function (error, errData, result, message) {
                    if (error & result == null) {
                        res.status(500).json({
                            status: false,
                            message: message,
                            supplierId: null,
                            errData: errData.errors
                        })
                    }
                    else if (error && result) {
                        res.status(500).json({
                            status: false,
                            message: message,
                            supplierId: null,
                        })
                    }
                    else {
                        res.status(200).json({
                            status: true,
                            message: message,
                            supplierId: result._id,
                        })
                    }
                })
        }
        catch (er) {
            res.status(500).json({ status: false, message: er });
        }
    });
    //END OF API FOR ADD SUPPLIER DETAILS 
    //START OF API FOR VIEW ALL SUPPLIER DETAILS 
    //Params:
    //Response: status, message,data
    //Functions:viewSupplier
    app.get('/api/view/allsuppliers', function (req, res) {
        try {
            supplierModule.viewSuppliers(
                function (error, message, result) {
                    if (error) {
                        res.status(500).json({
                            status: false,
                            message: message,
                            data: result
                        })
                    }
                    else {
                        res.status(200).json({
                            status: true,
                            message: message,
                            data: result
                        })
                    }
                })
        }
        catch (er) {
            res.status(500).json({ status: false, message: er });
        }
    });
    //END OF API FOR VIEW ALL SUPPLIER DETAILS 
    //START OF API FOR VIEW SUPPLIER DETAILS 
    //Params:
    //Response: status, message,data
    //Functions:viewSingleSupplier
    app.get('/api/view/singlesupplier/:supplierCode', function (req, res) {
        try {
            if (!req.params.supplierCode) {
                res.status(400).json({ status: false, message: "supplierCode parameter is missing" });
                return;
            }
            let supplierCode = req.params.supplierCode
            supplierModule.viewSingleSupplier(supplierCode,
                function (error, message, result) {
                    if (error) {
                        res.status(500).json({
                            status: false,
                            message: message,
                            data: result
                        })
                    }
                    else {
                        if (!result) {
                            res.status(200).json({
                                status: false,
                                message: message,
                                data: result
                            })
                            return
                        }
                        res.status(200).json({
                            status: true,
                            message: message,
                            data: result
                        })
                    }
                })
        }
        catch (er) {
            res.status(500).json({ status: false, message: er });
        }
    });
    //END OF API FOR VIEW SUPPLIER DETAILS 
};