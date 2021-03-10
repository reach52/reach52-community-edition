const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require("mongoose");
const connectDB = require('./database/mongoose');
const config = require('config');
const configDetails = require('./config/config.json')
const PORT = configDetails.development.PORT
var cron = require('node-cron');
const order = require('./models/order-schema');
const residents = require('./models/resident-schema');
const pointsAudit = require('./models/pointsAudit-schema');
//const PORT = 8000

/*middlewares*/
app.use(bodyParser.json({
    limit: '150mb',
    verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(bodyParser.urlencoded({ limit: '150mb', extended: true }));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

//mongodb connection using mongoose
connectDB()

app.get('/', (req, res) => {
    res.send('Welcome to Unicef API!')
})

/*Incudes all API routes*/
require('./routes/index')(app, connectDB);

// Start the cron job ----
cron.schedule("00 00 00 * * *", function() { 
   // cron.schedule("*/10 * * * * *", function() { 
    updateOrderStatus(function(err, res){
        if (err){
        }
        else{
        }
    })
}); 
async function updateOrderStatus(callbackfn) {
    try {
    let result= await order.find({ isPointsAddedToResident:false })
      
      Promise.all(
        result.map(async ele=>{
          let orderdata = await order.findOneAndUpdate({ _id: ele._id },
                { $set:{isDelivered : true,isPointsAddedToResident:true} },
                { new: true })
           let auditdata = await pointsAudit.findOneAndUpdate({ orderId: ele._id },
                    { $set:{isActive : false} },
                    { new: true })
                    let points = auditdata.earnedPoints
                let residentdata =  await residents.findOneAndUpdate({ _id: ele._id },
                        { $set:{isPointsAddedToResident:true,earnedPoints:points} },
                        { new: true })
                    let finalData = {...orderdata,...auditdata,...residentdata}
                return finalData
          })

    ).then(function(documents) {
       console.log(documents)
    });
  /*  let res = await Order.updateMany(
        { isDelivered : true,isPointsAddedToResident:true },
          { new: true })
              await pointsAudit.updateMany(
                {isActive : false},
                  { new: true })
                  await residents.updateMany(
                    {availablePoints : '50'},
                      { new: true })  */
         
  // console.log("result",res)
   callbackfn(null, finalData);
} catch (err) {
    callbackfn(err, null,);
}
}
// End the cron job ----
/*Listen express server on port*/
app.listen(process.env.PORT || PORT, () => {
    console.info(`Server is running on port.... ${process.env.PORT || PORT}`);
});


// cron.schedule('* * * * *', () => {
//     console.log('running a task every minute');
//   });


  
//   cron.schedule('59 23 * * *', () => {
//     console.log('running a task at 11:59 PM every day');
//   });

//mongodb+srv://admin:vishal1234@cluster0.yuwek.mongodb.net/products?retryWrites=true&w=majority
//mongodb+srv://gstuser:n03ntry428@cluster0-i3gc0.mongodb.net/helmethead?retryWrites=true&w=majority
//mongodb+srv://unicef:unicef@cluster0.xwra6.mongodb.net/unicef?retryWrites=true&w=majority
//mongodb+srv://kunalsolace:Kunal2021@realmcluster.bulij.mongodb.net/InventoryDemo