import client from "./client";

export const api = {
  // Auth
  login: (username, password) => client.post("/auth/token/", { username, password }),
  register: (payload) => client.post("/register/", payload),
  currentUser: () => client.get("/auth/me/"),

  // Jugadores / cartas
  myProfile: () => client.get("/players/me/"),
  listPlayers: () => client.get("/players/"),
  getPlayer: (id) => client.get(`/players/${id}/`),
  updateCardStyle: (id, data) => client.patch(`/players/${id}/`, data),
  uploadPhoto: (id, file) => {
    const form = new FormData();
    form.append("photo", file);
    return client.patch(`/players/${id}/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  calibratePlayer: (id) => client.post(`/players/${id}/calibrate/`),
  assignEvaluators: (id, voterIds) => client.post(`/players/${id}/assign_evaluators/`, { voter_ids: voterIds }),

  // Valoración inicial (inmutable: un voto no se puede editar una vez emitido)
  listInitialVotes: (targetId) => client.get(`/initial-votes/?target=${targetId}`),
  castInitialVote: (payload) => client.post("/initial-votes/", payload),

  // Partidos
  listMatches: () => client.get("/matches/"),
  getMatch: (id) => client.get(`/matches/${id}/`),
  createMatch: (payload) => client.post("/matches/", payload),
  deleteMatch: (id) => client.delete(`/matches/${id}/`),
  addPlayersToMatch: (id, players) => client.post(`/matches/${id}/add_players/`, { players }),
  finishMatch: (id, scores) => client.post(`/matches/${id}/finish/`, scores),
  generateTotw: (id) => client.post(`/matches/${id}/generate_totw/`),
  currentTotw: (id) => client.get(`/matches/${id}/current_totw/`),

  // Votación post-partido (inmutable: se manda el Top 5 completo en una sola petición)
  submitMatchVotes: (matchId, votes) => client.post(`/matches/${matchId}/vote/`, { votes }),
  listMatchVotes: (matchId) => client.get(`/match-votes/?match=${matchId}`),

  // Cuenta
  updateAccount: (payload) => client.patch("/auth/me/", payload),
  changePassword: (payload) => client.post("/auth/change-password/", payload),

  // Panel de admin
  adminUsersOverview: () => client.get("/admin/users-overview/"),
  deleteUser: (id) => client.delete(`/admin/users/${id}/`),
};
