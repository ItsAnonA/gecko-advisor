/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { scanV1Router } from "./v1.scan.js";
import { reportV1Router } from "./v1.reports.js";
import { scanV2Router } from "./v2.scan.js";
import { reportV2Router } from "./v2.reports.js";
import { blogV2Router } from "./v2.blog.js";

export const apiV1Router = Router();
apiV1Router.use('/scan', scanV1Router);
apiV1Router.use('/scans', scanV1Router);
apiV1Router.use('/', reportV1Router);

export const apiV2Router = Router();
apiV2Router.use('/scan', scanV2Router);
apiV2Router.use('/scans', scanV2Router);
apiV2Router.use('/', reportV2Router);
apiV2Router.use('/', blogV2Router);
