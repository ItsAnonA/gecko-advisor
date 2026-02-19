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
import { domainV2Router } from "./v2.domain.js";
import { contextV2Router } from "./v2.context.js";
import { categoriesV2Router } from "./v2.categories.js";
import { changesV2Router } from "./v2.changes.js";
import { insightsV2Router } from "./v2.insights.js";
import { transparencyV2Router } from "./v2.transparency.js";
import { sampleRequestV2Router } from "./v2.sampleRequest.js";
import { narrativeV2Router } from "./v2.narrative.js";
import { rankingsV2Router } from "./v2.rankings.js";
import { trackersV2Router } from "./v2.trackers.js";
import { answersV2Router } from "./v2.answers.js";
import { similarV2Router } from "./v2.similar.js";
import { researchV2Router } from "./v2.research.js";
import { domainV1Router } from "./v1.domain.js";

export const apiV1Router = Router();
apiV1Router.use('/scan', scanV1Router);
apiV1Router.use('/scans', scanV1Router);
apiV1Router.use('/', reportV1Router);
apiV1Router.use('/', domainV1Router);

export const apiV2Router = Router();
apiV2Router.use('/scan', scanV2Router);
apiV2Router.use('/scans', scanV2Router);
apiV2Router.use('/', reportV2Router);
apiV2Router.use('/', blogV2Router);
apiV2Router.use('/', domainV2Router);
apiV2Router.use('/', contextV2Router);
apiV2Router.use('/', categoriesV2Router);
apiV2Router.use('/changes', changesV2Router);
apiV2Router.use('/insights', insightsV2Router);
apiV2Router.use('/transparency', transparencyV2Router);
apiV2Router.use('/', sampleRequestV2Router);
apiV2Router.use('/', narrativeV2Router);
apiV2Router.use('/rankings', rankingsV2Router);
apiV2Router.use('/trackers', trackersV2Router);
apiV2Router.use('/answers', answersV2Router);
apiV2Router.use('/similar', similarV2Router);
apiV2Router.use('/research', researchV2Router);
