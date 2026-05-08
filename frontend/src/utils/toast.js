let toastFn = null;

export const toast = (msg, type = "success") => toastFn?.(msg, type);

export const setToastFn = (fn) => {
  toastFn = fn;
};
