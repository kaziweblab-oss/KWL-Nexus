export const providerFields: Record<string, string[]> = {
  mongodb: ["uri"], facebook: ["clientId", "clientSecret"], google: ["clientId", "clientSecret"], github: ["token"], stripe: ["secretKey", "publishableKey"], resend: ["apiKey"], smtp: ["host", "port", "username", "password"], cloudinary: ["cloudName", "apiKey", "apiSecret"], s3: ["accessKeyId", "secretAccessKey", "region", "bucket"], twilio: ["accountSid", "authToken", "phoneNumber"], firebase: ["projectId", "clientEmail", "privateKey"],
};
