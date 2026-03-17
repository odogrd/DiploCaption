import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import settingsRouter from "./settings";
import captionsRouter from "./captions";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(settingsRouter);
router.use(captionsRouter);
router.use(historyRouter);

export default router;
