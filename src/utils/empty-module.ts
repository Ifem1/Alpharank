const emptyModule = {};

export default emptyModule;
export const getItem = () => Promise.resolve(null);
export const setItem = () => Promise.resolve();
export const removeItem = () => Promise.resolve();
export const clear = () => Promise.resolve();
export const getAllKeys = () => Promise.resolve([]);
