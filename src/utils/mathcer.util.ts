export const matchGameServerAddress = (val: string) =>
    new RegExp("^ws://.+?:[0-9]{1,5}/?$").test(val);
