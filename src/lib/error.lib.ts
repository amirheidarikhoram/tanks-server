export function ActionError(message = "Desired action could not be processed") {
    return {
        type: "error",
        message,
    };
}
