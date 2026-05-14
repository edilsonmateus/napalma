import { Router } from "express";
import { requireRole } from "../middlewares/rbac.js";
import { requireAuth } from "../middlewares/auth.js";
import { createEvent, deleteEvent, getEventById, listEvents, updateEvent } from "../controllers/events.controller.js";
import { listRegions } from "../controllers/regions.controller.js";
import {
  addVenueManager,
  createVenue,
  deleteVenue,
  getVenueById,
  listVenueManagers,
  listVenues,
  removeVenueManager,
  updateVenue
} from "../controllers/venues.controller.js";
import {
  createArtist,
  deleteArtist,
  getArtistById,
  listArtists,
  updateArtist
} from "../controllers/artists.controller.js";
import { login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { listVenueManagerUsers } from "../controllers/users.controller.js";

export const router = Router();

const canManageEvents = [requireAuth, requireRole(["admin", "producer", "venue_manager"])];
const canManageCatalog = [requireAuth, requireRole(["admin", "producer"])];

router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/refresh", refresh);
router.post("/auth/logout", logout);
router.get("/auth/me", requireAuth, me);
router.get("/users/venue-managers", ...canManageCatalog, listVenueManagerUsers);

router.get("/events", listEvents);
router.get("/events/:id", getEventById);
router.post("/events", ...canManageEvents, createEvent);
router.patch("/events/:id", ...canManageEvents, updateEvent);
router.delete("/events/:id", ...canManageEvents, deleteEvent);
router.get("/regions", listRegions);
router.get("/venues", listVenues);
router.get("/venues/:id", getVenueById);
router.post("/venues", ...canManageCatalog, createVenue);
router.patch("/venues/:id", ...canManageCatalog, updateVenue);
router.delete("/venues/:id", ...canManageCatalog, deleteVenue);
router.get("/venues/:id/managers", ...canManageCatalog, listVenueManagers);
router.post("/venues/:id/managers", ...canManageCatalog, addVenueManager);
router.delete("/venues/:id/managers/:userId", ...canManageCatalog, removeVenueManager);
router.get("/artists", listArtists);
router.get("/artists/:id", getArtistById);
router.post("/artists", ...canManageCatalog, createArtist);
router.patch("/artists/:id", ...canManageCatalog, updateArtist);
router.delete("/artists/:id", ...canManageCatalog, deleteArtist);
