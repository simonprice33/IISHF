import { configureStore } from "@reduxjs/toolkit";

// A minimal valid reducer so the store can initialise.
// Replace with real slices later.
function noopReducer(state = {}) {
  return state;
}

export const store = configureStore({
  reducer: {
    app: noopReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
