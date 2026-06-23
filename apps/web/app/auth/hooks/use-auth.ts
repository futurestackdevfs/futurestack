export function useAuth() {
  return {
    user: {
      name: "Rahul Sharma",
      email: "rahul@example.com",
      level: "Intermediate",
      xp: 1240,
    },
    isAuthenticated: true,
    login: async () => {},
    logout: async () => {},
  };
}
