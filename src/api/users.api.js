import api from './axios';

export const usersAPI = {
  // POST /users
  create: (payload) => api.post("/users", payload),

  // GET /users
  list: () => api.get("/users"),

  // GET /users/{id}
  getById: (id) => api.get(`/users/${id}`),

  // PUT /users/{userId}/assign-branch
  assignBranch: (userId, payload) =>
    api.put(`/users/${userId}/assign-branch`, payload),

  // PUT /users/{userId}/status
  updateStatus: (userId, payload) =>
    api.put(`/users/${userId}/status`, payload),

  // PUT /users/{userId}/reset-password
  resetPassword: (userId, payload) =>
    api.put(`/users/${userId}/reset-password`, payload),
};
