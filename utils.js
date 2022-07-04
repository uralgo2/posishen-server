class ApiError extends Error {
    constructor(message) {
        super(message);
    }
}
module.exports = {
    isProduction: () => false,//process.env.NODE_ENV === "production"
    ApiError: ApiError
}