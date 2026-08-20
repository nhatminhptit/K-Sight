import { createSlice } from "@reduxjs/toolkit";

const access_token = localStorage.getItem("access_token");
const user_info = localStorage.getItem("user_info");

const initialState = {
  user: user_info ? JSON.parse(user_info) : null,
  token: access_token || null,
  isAuthenticated: Boolean(access_token),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem("access_token", token);
      localStorage.setItem("user_info", JSON.stringify(user));
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem("user_info", JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_info");
    },
  },
});

export const { loginSuccess, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
