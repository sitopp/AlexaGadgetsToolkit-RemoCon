//
// Copyright 2019 Amazon.com, Inc. or its affiliates.  All Rights Reserved.
// These materials are licensed under the Amazon Software License in connection with the Alexa Gadgets Program.
// The Agreement is available at https://aws.amazon.com/asl/.
// See the Agreement for the specific terms and conditions of the Agreement.
// Capitalized terms not defined in this file have the meanings given to them in the Agreement.
//
// 20191205 sitopp 
//     use "Color Cycler" example 
//     change Language to Japanese 
//     change LED handle -> air-con turn on / off
// 注意：「家電リモコンで暖房つけて」と続けて発話すると、AirConOnHandlerに入るのですが、
//     Alexa Gadget Toolkitに対応したペアリング済みのGadgetをスキャンする処理は、LaunchRequestHandlerで実施して、
//     sessionAttributesで引き回すようになってますので、AirConOnHandlerをいきなり呼ばれると
//     「gadget endpointIdが無い」で落ちてしまいます。
//     続けて発話できるように改造したい人は、L.63　getConnectedEndpoints() ~ L.82 までをコピーして、
//     AirConOnHandlerで使ってください。
// 

'use strict';

const Alexa = require('ask-sdk-core');
const Https = require('https');
const Uuid = require('uuid/v4');

let skill;
exports.handler = function (event, context) {

    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                handler.LaunchRequestHandler,
                handler.AirConOnHandler,
                handler.AirConOffHandler,
                handler.YesIntentHandler,
                handler.NoIntentHandler,
                handler.StopAndCancelIntentHandler,
                handler.SessionEndedRequestHandler,
                handler.DefaultHandler
            )
            .addRequestInterceptors(handler.RequestInterceptor)
            .addResponseInterceptors(handler.ResponseInterceptor)
            .addErrorHandlers(handler.ErrorHandler)
            .create();
    }
    return skill.invoke(event, context);
};

const handler = {
    LaunchRequestHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            console.log("LaunchRequestHandler: checking if it can handle " + request.type);
            return request.type === 'LaunchRequest';
        },
        async handle(handlerInput) {
            console.log("== Launch Intent ==");
            console.log(JSON.stringify(handlerInput.requestEnvelope));

            let { context } = handlerInput.requestEnvelope;
            let { apiEndpoint, apiAccessToken } = context.System;
            let response;
            try {
                // Get connected gadget endpointId.
                console.log("Checking endpoint");
                response = await getConnectedEndpoints(apiEndpoint, apiAccessToken);
                console.log("v1/endpoints response: " + JSON.stringify(response));

                if ((response.endpoints || []).length === 0) {
                    console.log('No connected gadget endpoints available');
                    response = handlerInput.responseBuilder
                        .speak("ラズベリーパイとペアリングできていないようです。")
                        .getResponse();
                    return response;
                }
                var endpointId = '';
                var i = 0;
                while (i < response.endpoints.length || i > 2) {
                    console.log("in loop interface: " + response.endpoints[i].capabilities[0].interface);
                    console.log("in loop endpointId: " + response.endpoints[i].endpointId);
                    if (response.endpoints[i].capabilities[0].interface === "Custom.RemoConGadget") {
                        endpointId = response.endpoints[i].endpointId;
                    }
                    i++;
                }
                // Store endpointId for using it to send custom directives later.
                console.log("Received endpoints. Storing Endpoint Id: " + endpointId);
                const attributesManager = handlerInput.attributesManager;
                let sessionAttributes = attributesManager.getSessionAttributes();
                sessionAttributes.endpointId = endpointId;
                attributesManager.setSessionAttributes(sessionAttributes);

                return handlerInput.responseBuilder
                    .speak("お館様、ご命令を")
                    .withShouldEndSession(false)
                    .getResponse();
            }
            catch (err) {
                console.log("An error occurred while getting endpoints", err);
                response = handlerInput.responseBuilder
                    .speak("エンドポイントに接続できません。終了します。")
                    .withShouldEndSession(true)
                    .getResponse();
                return response;
            }
        }
    },
    AirConOnHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("AirConOnHandlerIntent: checking if it can handle " +
                request.type + " for " + intentName);
            return request.intent && request.intent.name === 'AirConOnHandlerIntent';
        },
        async handle(handlerInput) {
            console.log("== AirConOnHandlerIntent ==");
            console.log(JSON.stringify(handlerInput.requestEnvelope));

            // Retrieve the stored gadget endpointId from the SessionAttributes.
            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes();
            let endpointId = sessionAttributes.endpointId;

            try {
                return handlerInput.responseBuilder
                    .speak("暖房をつけます。")
                    .withShouldEndSession(false)
                    .addDirective(buildAirConOnDirective(endpointId))
                    .getResponse();
            }
            catch (err) {
                console.log("An error occurred while getting endpoints", err);
                response = handlerInput.responseBuilder
                    .speak("エンドポイントと接続できませんでした。")
                    .withShouldEndSession(true)
                    .getResponse();
                return response;
            }
        }
    },
    AirConOffHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("AirConOffHandlerIntent: checking if it can handle " +
                request.type + " for " + intentName);
            return request.intent && request.intent.name === 'AirConOffHandlerIntent';
        },
        async handle(handlerInput) {
            console.log("== AirConOffHandlerIntent ==");
            console.log(JSON.stringify(handlerInput.requestEnvelope));

            // Retrieve the stored gadget endpointId from the SessionAttributes.
            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes();
            let endpointId = sessionAttributes.endpointId;

            try {
                return handlerInput.responseBuilder
                    .speak("暖房を消します。")
                    .withShouldEndSession(false)
                    .addDirective(buildAirConOffDirective(endpointId))
                    .getResponse();
            }
            catch (err) {
                console.log("An error occurred while getting endpoints", err);
                response = handlerInput.responseBuilder
                    .speak("エンドポイントと接続できませんでした。")
                    .withShouldEndSession(true)
                    .getResponse();
                return response;
            }
        }
    },
    YesIntentHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("YesIntentHandler: checking if it can handle " +
                request.type + " for " + intentName);
            return request.intent && request.intent.name === 'AMAZON.YesIntent';
        },
        handle(handlerInput) {
            // Retrieve the stored gadget endpointId from the SessionAttributes.
            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes();
            let endpointId = sessionAttributes.endpointId;

            // Create a token to be assigned to the EventHandler and store it
            // in session attributes for stopping the EventHandler later.
            sessionAttributes.token = Uuid();
            attributesManager.setSessionAttributes(sessionAttributes);
            console.log("YesIntent received.");

            return handlerInput.responseBuilder
                .getResponse();
        }
    },
    NoIntentHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("NoIntentHandler: checking if it can handle " +
                request.type + " for " + intentName);
            return request.intent && request.intent.name === 'AMAZON.NoIntent';
        },
        handle(handlerInput) {
            console.log("Received NoIntent..Exiting.");
            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes();

            // Send StopLED directive to stop LED animation and end skill session.
            return handlerInput.responseBuilder
                .speak("終了します。")
                .withShouldEndSession(true)
                .getResponse();
        }
    },

    StopAndCancelIntentHandler: {
        canHandle(handlerInput) {
            const { request } = handlerInput.requestEnvelope;
            const intentName = request.intent ? request.intent.name : '';
            console.log("StopAndCancelIntentHandler: checking if it can handle " +
                request.type + " for " + intentName);
            return request.type === 'IntentRequest' &&
                (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent');
        },
        handle(handlerInput) {
            console.log("Received a Stop or a Cancel Intent..");

            let { attributesManager, responseBuilder } = handlerInput;
            let sessionAttributes = attributesManager.getSessionAttributes();

            return responseBuilder.speak("了解です。またお会いしましょう。")
                .withShouldEndSession(true)
                .getResponse();
        }
    },
    SessionEndedRequestHandler: {
        canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
        },
        handle(handlerInput) {
            console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
            return handlerInput.responseBuilder.getResponse();
        },
    },
    ErrorHandler: {
        canHandle(handlerInput, error) {
            let { request } = handlerInput.requestEnvelope;
            console.log("ErrorHandler: checking if it can handle " +
                request.type + ": [" + error.name + "] -> " + !!error.name);
            return !!error.name;
        },
        handle(handlerInput, error) {
            console.log("Global.ErrorHandler: error = " + error.message);

            return handlerInput.responseBuilder
                .speak("システムに異常が起きてます。")
                .getResponse();
        }
    },
    RequestInterceptor: {
        process(handlerInput) {
            let { attributesManager, requestEnvelope } = handlerInput;
            let sessionAttributes = attributesManager.getSessionAttributes();

            // Log the request for debugging purposes.
            console.log(`==Request==${JSON.stringify(requestEnvelope)}`);
            console.log(`==SessionAttributes==${JSON.stringify(sessionAttributes, null, 2)}`);
        }
    },
    ResponseInterceptor: {
        process(handlerInput) {
            let { attributesManager, responseBuilder } = handlerInput;
            let response = responseBuilder.getResponse();
            let sessionAttributes = attributesManager.getSessionAttributes();

            // Log the response for debugging purposes.
            console.log(`==Response==${JSON.stringify(response)}`);
            console.log(`==SessionAttributes==${JSON.stringify(sessionAttributes, null, 2)}`);
        }
    },
    DefaultHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("DefaultHandler: checking if it can handle " +
                request.type + " for " + intentName);
            return true;
        },
        handle(handlerInput) {
            console.log("Unsupported Intent receive..Exiting.");
            return handlerInput.responseBuilder
                .speak("またいつでもお呼びください。")
                .getResponse();
        }
    }
};

function getConnectedEndpoints(apiEndpoint, apiAccessToken) {
    apiEndpoint = (apiEndpoint || '').replace('https://', '');

    return new Promise(((resolve, reject) => {
        var options = {
            host: apiEndpoint,
            path: '/v1/endpoints',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiAccessToken
            }
        };

        const request = Https.request(options, (response) => {
            response.setEncoding('utf8');
            let returnData = '';

            response.on('data', (chunk) => {
                returnData += chunk;
            });

            response.on('end', () => {
                resolve(JSON.parse(returnData));
            });

            response.on('error', (error) => {
                reject(error);
            });
        });
        request.end();
    }));
}


function buildAirConOnDirective(endpointId) {
    return {
        type: 'CustomInterfaceController.SendDirective',
        header: {
            name: 'AirConOn',
            namespace: 'Custom.RemoConGadget'
        },
        endpoint: {
            endpointId: endpointId
        },
        payload: {}
    };
}

function buildAirConOffDirective(endpointId) {
    return {
        type: 'CustomInterfaceController.SendDirective',
        header: {
            name: 'AirConOff',
            namespace: 'Custom.RemoConGadget'
        },
        endpoint: {
            endpointId: endpointId
        },
        payload: {}
    };
}

