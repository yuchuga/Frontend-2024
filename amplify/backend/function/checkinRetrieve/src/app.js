/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/
const AWS = require('aws-sdk')
const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const ALLOW_ORIGIN = (process.env.ENV === 'prod') ? 'https://biz.cardspal.com' : '*'

// declare a new express app
const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

AWS.config.update({ region: process.env.TABLE_REGION })
const dynamodb = new AWS.DynamoDB.DocumentClient() //auto interpret datatype

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
  res.header("Access-Control-Allow-Headers", "*")
  next()
});

/**********************
 * Example get method *
 **********************/

app.get('/checkin/masterlist/:id', function(req, res) {
  let params = {
    TableName: "VoucherUser",
    IndexName: "transactionId-index", //GSI
    KeyConditionExpression: 'transactionId = :transactionId',
    ExpressionAttributeValues: {
      ':transactionId': req.params.id,
    }
  }
  //Query by transactionId in VoucherUser table
  dynamodb.query(params, async (error, result) => {
    if (error) {
      res.json({ statusCode: 500, error: error.message })
    } else {
      const dealId = result.Items[0].dealId
      const dealData = await getDealMaster(dealId)

      let masterList = []
      for(let i = 0; i < result.Items.length; i++) {
        const voucherUser = result.Items[i]
        const checkInData = await getCheckIn(voucherUser.masterId)
        // console.log('checkInData ', checkInData)

        if (checkInData) {
          voucherUser.checkInData = checkInData
          voucherUser.valid = true
        } else {
          voucherUser.valid = false
        }
        masterList.push(voucherUser)
      }
      res.json({ statusCode: 200, url: req.url, body: JSON.stringify(masterList), dealBody: JSON.stringify(dealData) })
    }
  })
});

//Query by dealId in DealMaster table
const getDealMaster = async (dealId) => {
  let params = {
    TableName: "DealMaster",
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': dealId,
    }
  }

  try {
    const result = await dynamodb.query(params).promise()
    // console.log('dealResult:', result)
    return result.Items[0] 
  } catch (e) {
    console.error(e)
    return null
  }
}

//Query by masterId in CheckinTicket table
const getCheckIn = async (masterId) => {
  // console.log('masterId:', masterId)
  let params = {
    TableName: "CheckinTicket",
    KeyConditionExpression: 'masterId = :masterId',
    ExpressionAttributeValues: {
      ':masterId': masterId,
    }
  }

  try {
    const result = await dynamodb.query(params).promise()
    // console.log('checkinResult:', result)
    return result.Items[0]
  } catch (e) {
    console.error(e)
    return null
  }
}

app.get('/checkin/masterlist/:id/*', function(req, res) {
  // Add your code here
  res.json({success: 'get call succeed!', url: req.url});
});

/****************************
* Example post method *
****************************/

app.post('/checkin/masterlist', function(req, res) {
  // Add your code here
  res.json({success: 'post call succeed!', url: req.url, body: req.body})
});

app.post('/checkin/masterlist/*', function(req, res) {
  // Add your code here
  res.json({success: 'post call succeed!', url: req.url, body: req.body})
});

/****************************
* Example put method *
****************************/

app.put('/checkin/masterlist', function(req, res) {
  // Add your code here
  res.json({success: 'put call succeed!', url: req.url, body: req.body})
});

app.put('/checkin/masterlist/*', function(req, res) {
  // Add your code here
  res.json({success: 'put call succeed!', url: req.url, body: req.body})
});

/****************************
* Example delete method *
****************************/

app.delete('/checkin/masterlist', function(req, res) {
  // Add your code here
  res.json({success: 'delete call succeed!', url: req.url});
});

app.delete('/checkin/masterlist/*', function(req, res) {
  // Add your code here
  res.json({success: 'delete call succeed!', url: req.url});
});

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app