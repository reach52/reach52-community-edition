const medications = require('../models/catalouge-schema');
const catalogueFiles = require('../models/catalogue-file-schema');
const readXlsxFile = require('read-excel-file/node');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
//const failuerDir = process.env.FAILUERDIR
const DIR = require('../config/fileDetails.json');
module.exports = function () {
    var medicationModule = {
        // Start Generating catalogue number -----
        catalogueNumber: function (callBack) {
            try {
                medications.find({}).sort({ _id: -1 }).limit(1).then((data) => {
                    if (data.length > 0) {
                        var dbNum = data[0].r52CatNo;
                        // Incrementing the catalogue number
                        var r52CatNumber = parseInt(dbNum) + 1;
                        callBack(r52CatNumber);
                    }
                    else {
                        var r52CatNumber = 1000000;
                        callBack(r52CatNumber);
                    }
                }).catch(err => {
                    callBack(null);
                });
            } catch (e) {
                callBack(null);
            }
        },
        // End Generating catalogue number -----
        //Start of File Row Validation
        excelValidation: function (data, callBack) {
            try {
                // CHECK IF THESE FIELDS ARE EMPTY OR NOT 
                if (
                    !data.SupplierUniqueCatalogueNumber
                    || !data.BrandName
                    // || !data.Dosage
                    //|| !data.SupplierName
                    //|| !data.PackSize
                    // || !data.PackSizeUnits
                    // || !data.ProductType
                    // || !data.RequiresRx
                    // || !data.TaxName
                    // || !data.IsTaxExempt
                    // || !data.IsTaxIncluded
                    // || !data.TaxPercent
                    // || !data.PricePerPackage
                    || !data.Status
                    || !data.PointsAccumulation.toString()
                    // || !data.Manufacturer
                ) {
                    // IF EMPTY THEN SEND STATUS FALSE
                    callBack(false);
                }
                else {
                    // IF NOT EMPTY THEN SEND STATUS TRUE
                    callBack(true);
                }
            } catch (e) {
                callBack(null);
            }
        },
        //End of Validation
        // Start of Check duplicate data 
        checkDuplicate: function (SupplierUniqueCatalogueNumber, supplierCode, callBack) {
            try {
                // FIND DATA FROM MEDICATION COLLECTION BY SUPPLIER UNIQUE CATALOUGUE NUM & SUPPLIER CODE
                medications.findOne({ suppCatNo: SupplierUniqueCatalogueNumber, supplierCode: supplierCode }, function (err, doc) {
                    if (err) {
                        callBack(true, null);
                    }
                    if (doc) {
                        callBack(false, true);
                    }
                    else {
                        callBack(false, false);
                    }
                });
            } catch (e) {
                callBack(true, null);
            }
        },
        // End of Check duplicate data 
        // Start of Process File
        processFile: function (DIR, callBack) {
            try {
                //// FIND ALL CATALOUGE FILE DETAILS BY STATUS FALSE
                catalogueFiles.find({ status: false }).then((data) => {
                    // CHECK IF ANY FILE DETAILS FOUND
                    if (data.length > 0) {
                        var index = 0;
                        // RECURSIVE FUNCTION CHECK DATA 
                        var checkData = function (row) {
                            invalidDatas = [];
                            incorrectEntryCount = 0;
                            correctEntryCount = 0;
                            totalEntryCount = 0;
                            duplicateEntryCount = 0;
                            var fileName = row.fileName
                            var userId = row.userId
                            var supplierCode = row.supplierCode
                            var supplierName = row.supplierName
                            var isoCountryCode = row.isoCountryCode
                            var version = 1
                            // File path where file is saved
                            var filePath = path.resolve(DIR + fileName);
                            var fileExtention = fileName.split('.').pop()
                            // CHECK FILE EXTENTION TYPE 
                            if (fileExtention == "xlsx" || fileExtention == "xls") {
                                ////// THIS IS FOR XLSX FILE 
                                medicationModule.xlsxUpload(
                                    supplierName,
                                    isoCountryCode, userId, version, supplierCode, filePath, correctEntryCount, invalidDatas, duplicateEntryCount,
                                    function (error, totalEntryCount, correctEntryCount, invalidDatas, duplicateEntryCount) {
                                        // UPDATE THE UPLOAD FILE STATUS IN CATALOGUE FILE COLLECTION BY FILE NAME
                                        let updates = {
                                            status: true,
                                            successedRecordsCount: row.successedRecordsCount + correctEntryCount,
                                            failedRecordsCount: invalidDatas.length,
                                            totalRecordsCount: totalEntryCount,
                                            duplicateRecordsCount: duplicateEntryCount
                                        }
                                        catalogueFiles.findOneAndUpdate({ fileName: fileName },
                                            { $set: updates },
                                            { new: true }).then(response => {
                                                // CHECK IF ANY ROW OF FILE HAS VALIDATION ISSUE
                                                if (invalidDatas.length > 0) {
                                                    // IF ANY VALIDATION ISSUE FOUND THEN MAKE A FAILUER FILE & SAVE THAT FAILED ROW DATA
                                                    medicationModule.failuerFileUpload(fileName, invalidDatas,
                                                        function (error) {
                                                            // IF ANY ERROR HAPPENS AT FAILURE FILE SAVING
                                                            index++
                                                            // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                                            if (index < data.length) {
                                                                // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                                checkData(data[index]);
                                                            } else {
                                                                // IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                                callBack(false, 'File upload done');
                                                            }
                                                        })
                                                }
                                                else {
                                                    // IF NO FAILUER DATA FOUND THEN RESPONSE WILL BE HERE
                                                    index++
                                                    // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                                    if (index < data.length) {
                                                        // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                        checkData(data[index]);
                                                    } else {
                                                        // IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                        callBack(false, 'File upload done');
                                                    }
                                                }
                                            })
                                            .catch(err => {
                                                return res.status(400).json({ status: false, message: err });
                                            });
                                    })
                            }
                            else {
                                /// THIS IS FOR CSV FILE UPLOAD
                                medicationModule.csvUpload(
                                    supplierName,
                                    isoCountryCode, userId, version, supplierCode, filePath, totalEntryCount, correctEntryCount, invalidDatas, duplicateEntryCount,
                                    function (error, totalEntryCount, correctEntryCount, invalidDatas, duplicateEntryCount) {
                                        // UPDATE THE UPLOAD FILE STATUS IN CATALOGUE FILE COLLECTION BY FILE NAME
                                        let updates = {
                                            status: true,
                                            successedRecordsCount: row.successedRecordsCount + correctEntryCount,
                                            failedRecordsCount: invalidDatas.length,
                                            totalRecordsCount: totalEntryCount,
                                            duplicateRecordsCount: duplicateEntryCount
                                        }
                                        catalogueFiles.findOneAndUpdate({ fileName: fileName },
                                            { $set: updates },
                                            { new: true }).then(response => {
                                                // CHECK IF ANY ROW OF FILE HAS VALIDATION ISSUE
                                                if (invalidDatas.length > 0) {
                                                    // IF ANY VALIDATION ISSUE FOUND THEN MAKE A FAILUER FILE & SAVE THAT FAILED ROW DATA
                                                    medicationModule.failuerFileUpload(fileName, invalidDatas,
                                                        function (error) {
                                                            // IF ANY ERROR HAPPENS AT FAILURE FILE SAVING
                                                            index++
                                                            // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                                            if (index < data.length) {
                                                                // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                                checkData(data[index]);
                                                            } else {
                                                                // IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                                callBack(false, 'File upload done');
                                                            }
                                                        })
                                                }
                                                else {
                                                    // IF NO FAILUER DATA FOUND THEN RESPONSE WILL BE HERE
                                                    index++
                                                    // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                                    if (index < data.length) {
                                                        // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                        checkData(data[index]);
                                                    } else {
                                                        // IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                        callBack(false, 'File upload done');
                                                    }
                                                }
                                            })
                                            .catch(err => {
                                                return res.status(400).json({ status: false, message: err });
                                            });
                                    })
                            }
                        }
                        checkData(data[index]);
                    }
                    else {
                        callBack(false, 'No error file found');
                    }
                })
            } catch (e) {
                callBack(true, null);
            }
        },
        // End of Process File
        // Start of csv file upload
        csvUpload: function (
            supplierName,
            isoCountryCode, userId, version, supplierCode, filepath, totalEntryCount, correctEntryCount, invalidDatas, duplicateData, callBack) {
            try {
                var prescriptionRequired = false
                var PricePerPackage = 0
                var taxPercentage = 0
                var isoCurrency = ""
                var isIncluded
                var IsTaxExempt
                var r52CatNo;
                rows = []
                rawDocuments = []
                // START READING OF CSV FILE
                fs.createReadStream(filepath)
                    .pipe(csv())
                    .on('data', (rowData) => {
                        // AFTER READ ALL ROWS OF FILE PUSH DATAS INSIDE ROWS ARRAY
                        rows.push(rowData)
                    })
                    .on('end', () => {
                        if (rows.length !== 0) {
                            // GENERATE CATALOUGUE NUMBER
                            medicationModule.catalogueNumber(function (result) {
                                r52CatNo = result
                                var index = 0;
                                // RECURSIVE FUNCTION INSERT DATA FOUND
                                var insertData = function (row) {
                                    // EXCEL FILE ROW VALIDATION FOR EMPTY DATA IN ANY MANDATORY COLUMN
                                    medicationModule.excelValidation(row, function (status) {
                                        if (status) {
                                            /// DUPLICATE SUPPLIER CATALOUGE NUMBER CHECK
                                            medicationModule.checkDuplicate(row.SupplierUniqueCatalogueNumber, supplierCode, function (error, isDuplicate) {
                                                // IF NO DUPLICATE DATA FOUND
                                                if (!isDuplicate) {
                                                    // INCREASE CORRECT ENTRY VALUE
                                                    correctEntryCount = correctEntryCount + 1
                                                    if (row.IsTaxIncluded == 'Yes' || row.IsTaxIncluded == 1) {
                                                        isIncluded = true
                                                    }
                                                    else {
                                                        isIncluded = false
                                                    }
                                                    if (row.IsTaxExempt == 'Yes' || row.IsTaxExempt == 1) {
                                                        IsTaxExempt = true
                                                    }
                                                    else {
                                                        IsTaxExempt = false
                                                    }
                                                    if (row.RequiresRx == 'Yes' || row.RequiresRx == 1) {
                                                        prescriptionRequired = true
                                                    }
                                                    if (parseFloat(row.PricePerPackage).toFixed(2) == 'NaN') {
                                                        PricePerPackage = parseFloat(PricePerPackage).toFixed(2)
                                                    }
                                                    else {
                                                        PricePerPackage = parseFloat(row.PricePerPackage).toFixed(2)
                                                    }
                                                    if (parseFloat(row.TaxPercent).toFixed(2) == 'NaN') {
                                                        taxPercentage = parseFloat(taxPercentage).toFixed(2)
                                                    }
                                                    else {
                                                        taxPercentage = parseFloat(row.TaxPercent).toFixed(2)
                                                    }
                                                    var customBrandName = {}
                                                    customBrandName.eng = row.BrandName == null ? "NA" : row.BrandName
                                                    if (row.BrandNameAsLocal) {
                                                        if (isoCountryCode == "IND" && row.BrandNameAsLocal !== "") {
                                                            customBrandName.hindi = row.BrandNameAsLocal
                                                        }
                                                        if (isoCountryCode == "PHL" && row.BrandNameAsLocal !== "") {
                                                            customBrandName.hil = row.BrandNameAsLocal
                                                        }
                                                        if (isoCountryCode == "KHM" && row.BrandNameAsLocal !== "") {
                                                            customBrandName.khm = row.BrandNameAsLocal
                                                        }
                                                    }
                                                    if (isoCountryCode == "IND") {
                                                        isoCurrency = "INR"
                                                    }
                                                    if (isoCountryCode == "PHL") {
                                                        isoCurrency = "PHP"
                                                    }
                                                    if (isoCountryCode == "KHM") {
                                                        isoCurrency = "KHR"
                                                    }
                                                    // MAKE A MEDICATION DATA OBJECT 
                                                    const medicationData = {
                                                        information: {
                                                            "eng": "NA"
                                                        },
                                                        promotion: {
                                                            "eng": "NA"
                                                        },
                                                        stock: {
                                                            "qty": 0
                                                        },
                                                        suppliers: {
                                                            "eng": "NA"
                                                        },
                                                        ingredients: {
                                                            "eng": "NA"
                                                        },
                                                        handlingInstr: {
                                                            "eng": "NA"
                                                        },
                                                        isoCountry: isoCountryCode,
                                                        isoCurrency: isoCurrency,
                                                        supplierCode: supplierCode,
                                                        r52SupplierCode: supplierCode,
                                                        r52CatNo: r52CatNo,
                                                        suppCatNo: row.SupplierUniqueCatalogueNumber,
                                                        brandName: customBrandName,
                                                        genericName: {
                                                            eng: row.Generic == null ? "NA" : row.Generic
                                                        },
                                                        manufacturerName: row.Manufacturer,
                                                        description: {
                                                            eng: row.Description == null ? "NA" : row.Description
                                                        },
                                                        dosage: row.Dosage,
                                                        form: {
                                                            eng: row.Form == null ? "NA" : row.Form,
                                                        },
                                                        packSize: row.PackSize,
                                                        packSizeUnit: row.PackSizeUnits,
                                                        type: row.ProductType,
                                                        requireRx: row.RequiresRx,
                                                        tax: {
                                                            name: row.TaxName,
                                                            category: row.TaxName,
                                                            isIncluded: isIncluded,
                                                            percentage: taxPercentage,
                                                            type: row.TaxName,
                                                            IsTaxExempt: IsTaxExempt
                                                        },
                                                        pricePerPack: PricePerPackage,
                                                        price: PricePerPackage,
                                                        catalogTags: [row.CatalogTag],
                                                        status: row.Status,
                                                        pointsAccumulation: row.PointsAccumulation,
                                                        // supplierName: row.SupplierName,
                                                        // supplierName: {
                                                        //     "eng": row.SupplierName
                                                        // },
                                                        supplierName: {
                                                            eng: supplierName
                                                        },
                                                        prescriptionRequired: prescriptionRequired,
                                                        createdBy: {
                                                            userId: userId,
                                                            utcDatetime: new Date()
                                                        },
                                                        metaData: {
                                                            createdBy: {
                                                                userId: userId,
                                                                utcDatetime: new Date()
                                                            },
                                                            updatedBy: userId,
                                                            version: version
                                                        },
                                                        timestamp: new Date(),
                                                    };
                                                    // PUSH MEDICATION DATA OBJECT IN RAWDOCUMENT ARRAY FOR SAVING IN COLLECTION
                                                    rawDocuments.push(medicationData)
                                                    // INCREASE R52 CATALOUGUE NUMBER
                                                    r52CatNo = r52CatNo + 1
                                                    // INCREASE INDEX BY 1
                                                    index++;
                                                    // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                                    if (index < rows.length) {
                                                        // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                        insertData(rows[index]);
                                                    } else {
                                                        // IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                        medications.insertMany(rawDocuments)
                                                            .then(function (mongooseDocuments) {
                                                                callBack(false, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                            })
                                                            .catch(function (err) {
                                                                callBack(true, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                            });
                                                    }
                                                }
                                                else {
                                                    // IF DUPLICATE DATA FOUND
                                                    // MAKE MEDICATION DATA OBJECT FOR UPDATE DATA IN COLLECTION
                                                    var customBrandName = {}
                                                    customBrandName.eng = row.BrandName == null ? "NA" : row.BrandName
                                                    if (row.BrandNameAsLocal) {
                                                        if (isoCountryCode == "IND" && row.BrandNameAsLocal !== "") {
                                                            customBrandName.hindi = row.BrandNameAsLocal
                                                        }
                                                        if (isoCountryCode == "PHL" && row.BrandNameAsLocal !== "") {
                                                            customBrandName.hil = row.BrandNameAsLocal
                                                        }
                                                        if (isoCountryCode == "KHM" && row.BrandNameAsLocal !== "") {
                                                            customBrandName.khm = row.BrandNameAsLocal
                                                        }
                                                    }
                                                    if (isoCountryCode == "IND") {
                                                        isoCurrency = "INR"
                                                    }
                                                    if (isoCountryCode == "PHL") {
                                                        isoCurrency = "PHP"
                                                    }
                                                    if (isoCountryCode == "KHM") {
                                                        isoCurrency = "KHR"
                                                    }
                                                    // brandName: {
                                                    //     eng: row.BrandName == null ? "NA" : row.BrandName
                                                    // },
                                                    if (row.RequiresRx == 'Yes' || row.RequiresRx == 1) {
                                                        prescriptionRequired = true
                                                    }
                                                    if (parseFloat(row.PricePerPackage).toFixed(2) == 'NaN') {
                                                        PricePerPackage = parseFloat(PricePerPackage).toFixed(2)
                                                    }
                                                    else {
                                                        PricePerPackage = parseFloat(row.PricePerPackage).toFixed(2)
                                                    }
                                                    const medicationUpdateData = {
                                                        brandName: customBrandName,
                                                        information: {
                                                            "eng": "NA"
                                                        },
                                                        promotion: {
                                                            "eng": "NA"
                                                        },
                                                        stock: {
                                                            "qty": 0
                                                        },
                                                        suppliers: {
                                                            "eng": "NA"
                                                        },
                                                        ingredients: {
                                                            "eng": "NA"
                                                        },
                                                        handlingInstr: {
                                                            "eng": "NA"
                                                        },
                                                        isoCountry: isoCountryCode,
                                                        isoCurrency: isoCurrency,
                                                        supplierCode: supplierCode,
                                                        r52SupplierCode: supplierCode,
                                                        suppCatNo: row.SupplierUniqueCatalogueNumber,
                                                        genericName: {
                                                            eng: row.Generic == null ? "NA" : row.Generic
                                                        },
                                                        manufacturerName: row.Manufacturer,
                                                        description: {
                                                            eng: row.Description == null ? "NA" : row.Description
                                                        },
                                                        dosage: row.Dosage,
                                                        form: {
                                                            eng: row.Form == null ? "NA" : row.Form,
                                                        },
                                                        packSize: row.PackSize,
                                                        packSizeUnit: row.PackSizeUnits,
                                                        type: row.ProductType,
                                                        requireRx: row.RequiresRx,
                                                        tax: {
                                                            name: row.TaxName,
                                                            category: row.TaxName,
                                                            isIncluded: isIncluded,
                                                            percentage: taxPercentage,
                                                            type: row.TaxName,
                                                            IsTaxExempt: IsTaxExempt
                                                        },
                                                        pricePerPack: PricePerPackage,
                                                        price: PricePerPackage,
                                                        catalogTags: [row.CatalogTag],
                                                        status: row.Status,
                                                        pointsAccumulation: row.PointsAccumulation,
                                                        //supplierName: row.SupplierName,
                                                        // supplierName: {
                                                        //     "eng": row.SupplierName
                                                        // },
                                                        supplierName: {
                                                            "eng": supplierName
                                                        },
                                                        prescriptionRequired: prescriptionRequired,
                                                        metaData: {
                                                            updatedBy: userId,
                                                            version: version
                                                        },
                                                        timestamp: new Date(),
                                                    };
                                                    // UPDATE THAT DUPLICATE DATA IN MEDICATION COLLECTION BY SPECIFIC SUPPLIERUNIQUECATALOUGUENUM & SUPPLIER CODE
                                                    medications.findOneAndUpdate({ suppCatNo: row.SupplierUniqueCatalogueNumber, supplierCode: supplierCode },
                                                        { $set: medicationUpdateData },
                                                        { new: true }).then(result => {
                                                        }).catch(err => {
                                                            console.log('error', err)
                                                        });
                                                    // INCREASE DUPLICATE DATA COUNT
                                                    duplicateData = duplicateData + 1
                                                    // INCREASE INDEX BY 1
                                                    index++;
                                                    // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                                    if (index < rows.length) {
                                                        // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                        insertData(rows[index]);
                                                    } else {
                                                        // IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                        medications.insertMany(rawDocuments)
                                                            .then(function (mongooseDocuments) {
                                                                callBack(false, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                            })
                                                            .catch(function (err) {
                                                                callBack(true, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                            });
                                                    }
                                                }
                                            })
                                        }
                                        else {
                                            /////// IF ANY ISSUE FOUND
                                            var invaliRow = row
                                            // PUSH THAT ROW INSIDE INVALIDDATAS ARRAY
                                            invalidDatas.push(row)
                                            // INCREASE INDEX BY 1
                                            index++;
                                            // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                            if (index < rows.length) {
                                                // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                insertData(rows[index]);
                                            } else {
                                                //   IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                medications.insertMany(rawDocuments)
                                                    .then(function (mongooseDocuments) {
                                                        callBack(false, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                    })
                                                    .catch(function (err) {
                                                        callBack(true, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                    });
                                            }
                                        }
                                    })
                                }
                                // CHECK IF ROW HAS DATA OR EMPTY
                                if (rows.length !== 0) {
                                    // IF ROW IS NOT EMPTY ,THEN CALL INSERT DATA FUNCTION
                                    insertData(rows[index]);
                                }
                            })
                        }
                        else {
                            // IF FILE IS EMPTY OR ROW IS EMPTY
                            callBack(false, rows.length, correctEntryCount, invalidDatas, duplicateData);
                        }
                    })
            } catch (e) {
                callBack(true, totalEntryCount, correctEntryCount, invalidDatas, duplicateData);
            }
        },
        // End of csv file upload
        // Start of xlsx file upload
        xlsxUpload: function (
            supplierName,
            isoCountry, userId, version, supplierCode, filepath, correctEntryCount, invalidDatas, duplicateData, callBack) {
            try {
                var taxPercentage = 0
                var isIncluded
                var IsTaxExempt
                var r52CatNo = 0
                rawDocuments = []
                // START READING OF EXCEL/XLSX FILE
                readXlsxFile(fs.createReadStream(filepath), { sheet: 1 }).then((rows) => {
                    var theRemovedElement = rows.shift();
                    // CHECK IF FILE/ROW HAS DATA OR NOT
                    if (rows.length !== 0) {
                        var index = 0;
                        // CREATE CATALOUGUE NUMBER
                        medicationModule.catalogueNumber(function (result) {
                            r52CatNo = result
                            // INSERTDATA FUNCTION START
                            var insertData = function (doc) {
                                // CHECK IF DOC HAS NO VALUE
                                if (doc.length !== 0) {
                                    // IF DOC HAS DATA ,THEN MAKE A DATA OBJECT 
                                    const data = {
                                        SupplierUniqueCatalogueNumber: doc[1],
                                        BrandName: doc[2],
                                        Generic: doc[3],
                                        Manufacturer: doc[4],
                                        Description: doc[5],
                                        Dosage: doc[6],
                                        Form: doc[7],
                                        PackSize: doc[8],
                                        PackSizeUnits: doc[9],
                                        ProductType: doc[10],
                                        RequiresRx: doc[11],
                                        TaxName: doc[12],
                                        IsTaxExempt: doc[13],
                                        IsTaxIncluded: doc[14],
                                        TaxPercent: doc[15],
                                        PricePerPackage: doc[16],
                                        CatalogTag: doc[17],
                                        Status: doc[18],
                                        PointsAccumulation: doc[19],
                                        supplierCode: supplierCode,
                                        //  SupplierName: doc[20]
                                    };
                                    // CHECK DATA OBJECT VALIDATION FOR NO EMPTY COLUMNS FOR MANDATORY FIELDS
                                    medicationModule.excelValidation(data, function (status) {
                                        // IF VALIDATION DONE & STATUS TRUE
                                        if (status) {
                                            /// DUPLICATE SUPPLIER CATALOUGE NUMBER CHECK
                                            medicationModule.checkDuplicate(data.SupplierUniqueCatalogueNumber, data.supplierCode, function (error, isDuplicate) {
                                                // IF NO DUPLICATE DATA
                                                if (!isDuplicate) {
                                                    correctEntryCount = correctEntryCount + 1
                                                    if (doc[14] == 'Yes' || doc[14] == 1) {
                                                        isIncluded = true
                                                    }
                                                    else {
                                                        isIncluded = false
                                                    }
                                                    if (doc[13] == 'Yes' || doc[14] == 1) {
                                                        IsTaxExempt = true
                                                    }
                                                    else {
                                                        IsTaxExempt = false
                                                    }
                                                    // MAKE MEDICATION OBJECT
                                                    const medicationData = {
                                                        Information: {
                                                            "eng": "NA"
                                                        },
                                                        Promotion: {
                                                            "eng": "NA"
                                                        },
                                                        Stock: {
                                                            "eng": 0
                                                        },
                                                        Suppliers: {
                                                            "eng": "NA"
                                                        },
                                                        Ingredients: {
                                                            "eng": "NA"
                                                        },
                                                        HandlingInstr: {
                                                            "eng": "NA"
                                                        },
                                                        isoCountry: isoCountry,
                                                        supplierCode: supplierCode,
                                                        r52CatNo: r52CatNo,
                                                        suppCatNo: doc[1],
                                                        BrandName: {
                                                            eng: doc[2] == null ? "NA" : doc[2]
                                                        },
                                                        GenericName: {
                                                            eng: doc[3] == null ? "NA" : doc[3]
                                                        },
                                                        manufacturerName: doc[4],
                                                        Description: {
                                                            eng: doc[5] == null ? "NA" : doc[5]
                                                        },
                                                        dosage: doc[6],
                                                        Form: {
                                                            eng: doc[7] == null ? "NA" : doc[7]
                                                        },
                                                        packSize: doc[8],
                                                        packSizeUnit: doc[9],
                                                        type: doc[10],
                                                        requireRx: doc[11],
                                                        Tax: {
                                                            name: doc[12],
                                                            category: doc[12],
                                                            isIncluded: isIncluded,
                                                            percentage: parseFloat(doc[15]).toFixed(2),
                                                            type: doc[12],
                                                            IsTaxExempt: IsTaxExempt
                                                        },
                                                        // pricePerPack: parseFloat(doc[16]),
                                                        pricePerPack: parseFloat(doc[16]).toFixed(2),
                                                        price: parseFloat(doc[16]).toFixed(2),
                                                        catalogTags: [doc[17]],
                                                        status: doc[18],
                                                        pointsAccumulation: doc[19],
                                                        // supplierName: doc[20],
                                                        // supplierName: {
                                                        //     "eng": doc[20]
                                                        // },
                                                        supplierName: {
                                                            "eng": supplierName
                                                        },
                                                        createdBy: {
                                                            userId: userId,
                                                            utcDatetime: new Date()
                                                        },
                                                        metaData: {
                                                            createdBy: {
                                                                userId: userId,
                                                                utcDatetime: new Date()
                                                            },
                                                            updatedBy: userId,
                                                            version: version
                                                        },
                                                        timestamp: new Date(),
                                                    };
                                                    // PUSH MEDICATION OBJECT INSIDE RAW DOCUMENT ARRAY FOR FINAL INSERT
                                                    rawDocuments.push(medicationData)
                                                    // INCREASE CATALOGUE NUMBER
                                                    r52CatNo = r52CatNo + 1
                                                    // INCREASE INDEX BY 1
                                                    index++;
                                                    // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                                    if (index < rows.length) {
                                                        // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                        insertData(rows[index]);
                                                    } else {
                                                        // IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                        medications.insertMany(rawDocuments)
                                                            .then(function (mongooseDocuments) {
                                                                callBack(false, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                            })
                                                            .catch(function (err) {
                                                                callBack(true, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                            });
                                                    }
                                                    //////////
                                                }
                                                else {
                                                    // IF DUPLICATE DATA FOUND MAKE A OBJECT
                                                    const medicationUpdateData = {
                                                        Information: {
                                                            "eng": "NA"
                                                        },
                                                        Promotion: {
                                                            "eng": "NA"
                                                        },
                                                        Stock: {
                                                            "qty": 0
                                                        },
                                                        Suppliers: {
                                                            "eng": "NA"
                                                        },
                                                        Ingredients: {
                                                            "eng": "NA"
                                                        },
                                                        HandlingInstr: {
                                                            "eng": "NA"
                                                        },
                                                        isoCountry: isoCountry,
                                                        BrandName: {
                                                            eng: doc[2] == null ? "NA" : doc[2]
                                                        },
                                                        GenericName: {
                                                            eng: doc[3] == null ? "NA" : doc[3]
                                                        },
                                                        manufacturerName: doc[4],
                                                        Description: {
                                                            eng: doc[5] == null ? "NA" : doc[5]
                                                        },
                                                        dosage: doc[6],
                                                        Form: {
                                                            eng: doc[7] == null ? "NA" : doc[7]
                                                        },
                                                        packSize: doc[8],
                                                        packSizeUnit: doc[9],
                                                        type: doc[10],
                                                        requireRx: doc[11],
                                                        Tax: {
                                                            name: doc[12],
                                                            category: doc[12],
                                                            isIncluded: isIncluded,
                                                            percentage: parseFloat(doc[15]).toFixed(2),
                                                            type: doc[12],
                                                            IsTaxExempt: IsTaxExempt
                                                        },
                                                        pricePerPack: parseFloat(doc[16]).toFixed(2),
                                                        price: parseFloat(doc[16]).toFixed(2),
                                                        catalogTags: [doc[17]],
                                                        status: doc[18],
                                                        pointsAccumulation: doc[19],
                                                        // supplierName: doc[20],
                                                        // supplierName: {
                                                        //     "eng": doc[20]
                                                        // },
                                                        supplierName: {
                                                            "eng": supplierName
                                                        },
                                                        metadata: {
                                                            updatedBy: userId,
                                                            version: version
                                                        },
                                                        timestamp: new Date(),
                                                    };
                                                    // UPDATE THAT DUPLICATE DATA IN MEDICATION COLLECTION BY SPECIFIC SUPPLIERUNIQUECATALOUGUENUM & SUPPLIER CODE
                                                    medications.findOneAndUpdate({ suppCatNo: data.SupplierUniqueCatalogueNumber, supplierCode: supplierCode },
                                                        { $set: medicationUpdateData },
                                                        { new: true }).then(result => {
                                                        }).catch(err => {
                                                            console.log('error', error)
                                                        });
                                                    // INCREASE DUPLICATE DATA COUNT
                                                    duplicateData = duplicateData + 1
                                                    // INCREASE INDEX BY 1
                                                    index++;
                                                    // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                                    if (index < rows.length) {
                                                        // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                        insertData(rows[index]);
                                                    } else {
                                                        // IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                        medications.insertMany(rawDocuments)
                                                            .then(function (mongooseDocuments) {
                                                                callBack(false, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                            })
                                                            .catch(function (err) {
                                                                callBack(true, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                            });
                                                    }
                                                }
                                            })
                                        }
                                        else {
                                            /////// IF ANY ISSUE FOUND THEN MAKE A INVALIDATA OBJECT
                                            const invalidData = {
                                                CatalougeNumber: "",
                                                SupplierUniqueCatalogueNumber: doc[1],
                                                BrandName: doc[2],
                                                Generic: doc[3],
                                                Manufacturer: doc[4],
                                                Description: doc[5],
                                                Dosage: doc[6],
                                                Form: doc[7],
                                                PackSize: doc[8],
                                                PackSizeUnits: doc[9],
                                                ProductType: doc[10],
                                                RequiresRx: doc[11],
                                                TaxName: doc[12],
                                                IsTaxExempt: doc[13],
                                                IsTaxIncluded: doc[14],
                                                TaxPercent: doc[15],
                                                PricePerPackage: doc[16],
                                                CatalogTag: doc[17],
                                                Status: doc[18],
                                                pointsAccumulation: doc[19],
                                                SupplierName: doc[20]
                                            };
                                            // PUSH INVALID DATA OBJECR INSIDE INVALIDATA ARRAY
                                            invalidDatas.push(invalidData)
                                            // INCREASE INDEX BY 1
                                            index++;
                                            // CHECK IF MORE DATA IS AVAILABLE OR NOT IN FILE
                                            if (index < rows.length) {
                                                // IF MORE DATA AVAILABLE THEN CALL AGAIN INSERTDATA FUNCTION
                                                insertData(rows[index]);
                                            }
                                            else {
                                                // IF NO MORE DATA IN FILE THE INSERT BULK DATA IN MEDICATION COLLECTION
                                                medications.insertMany(rawDocuments)
                                                    .then(function (mongooseDocuments) {
                                                        callBack(false, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                    })
                                                    .catch(function (err) {
                                                        callBack(true, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                                    });
                                            }
                                        }
                                    })
                                }
                                else {
                                    index++;
                                    if (index < rows.length) {
                                        insertData(rows[index]);
                                    }
                                    else {
                                        medications.insertMany(rawDocuments)
                                            .then(function (mongooseDocuments) {
                                                callBack(false, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                            })
                                            .catch(function (err) {
                                                callBack(true, rows.length, correctEntryCount, invalidDatas, duplicateData);
                                            });
                                    }
                                }
                            }
                            // CHECK IF ROW HAS DATA OR EMPTY
                            if (rows.length !== 0) {
                                // IF ROW IS NOT EMPTY ,THEN CALL INSERT DATA FUNCTION
                                insertData(rows[index]);
                            }
                        })
                    }
                    else {
                        // IF FILE IS EMPTY OR ROW IS EMPTY
                        callBack(false, 0, correctEntryCount, invalidDatas, duplicateData);
                    }
                })
                    .catch(err => {
                        callBack(true, 0, correctEntryCount, invalidDatas, duplicateData);
                    })
            } catch (e) {
                callBack(true, 0, correctEntryCount, invalidDatas, duplicateData);
            }
        },
        // End of xlsx file upload
        // Start of Failuer data file create
        failuerFileUpload: function (filename, invalidDatas, callBack) {
            try {
                const csvWriter = createCsvWriter({
                    path: DIR.FAILUERDIR + filename,
                    header: [
                        { id: 'CatalougeNumber', title: 'CatalougeNumber' },
                        { id: 'SupplierUniqueCatalogueNumber', title: 'SupplierUniqueCatalogueNumber' },
                        { id: 'BrandName', title: 'BrandName' },
                        { id: 'Generic', title: 'Generic' },
                        { id: 'Manufacturer', title: 'Manufacturer' },
                        { id: 'Description', title: 'Description' },
                        { id: 'Dosage', title: 'Dosage' },
                        { id: 'Form', title: 'Form' },
                        { id: 'PackSize', title: 'PackSize' },
                        { id: 'PackSizeUnits', title: 'PackSizeUnits' },
                        { id: 'ProductType', title: 'ProductType' },
                        { id: 'RequiresRx', title: 'RequiresRx' },
                        { id: 'TaxName', title: 'TaxName' },
                        { id: 'IsTaxExempt', title: 'IsTaxExempt' },
                        { id: 'IsTaxIncluded', title: 'IsTaxIncluded' },
                        { id: 'TaxPercent', title: 'TaxPercent' },
                        { id: 'PricePerPackage', title: 'PricePerPackage' },
                        { id: 'CatalogTag', title: 'CatalogTag' },
                        { id: 'Status', title: 'Status' },
                        { id: 'PointsAccumulation', title: 'pointsAccumulation' },
                    ]
                });
                csvWriter.writeRecords(invalidDatas)
                    .then(() => {
                        callBack(false);
                    })
                    .catch(err => {
                        callBack(true);
                    });
            } catch (e) {
                callBack(true);
            }
        },
        // End of Failuer data file create
        //Start of view file details
        viewFiles: function (callBack) {
            try {
                catalogueFiles.find({}).sort({ _id: -1 }).then(response => {
                    if (response.length > 0) {
                        callBack(false, 'Files details found', response);
                    }
                    else {
                        callBack(false, 'No files details found', response);
                    }
                })
                    .catch(err => {
                        callBack(true, 'Error', null,);
                    });
            } catch (err) {
                callBack(true, err, null,);
            }
        }
        // End of view file details
    }
    return medicationModule;
}