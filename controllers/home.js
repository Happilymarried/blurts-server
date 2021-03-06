"use strict";

const AppConstants = require("../app-constants");
const DB = require("../db/DB");
const { scanResult } = require("../scan-results");
const { generatePageToken } = require("./utils");


async function home(req, res) {

  const formTokens = {
    pageToken: AppConstants.PAGE_TOKEN_TIMER > 0 ? generatePageToken(req) : "",
    csrfToken: req.csrfToken(),
  };

  const coinFlipNumber = Math.random() * 100;
  const experimentBranch = getExperimentBranch(req, coinFlipNumber);

  const isUserInExperiment = (experimentBranch === "vb");
  const experimentBranchB = (experimentBranch === "vb" && isUserInExperiment);

  let featuredBreach = null;
  let scanFeaturedBreach = false;

  if (req.session.user && !req.query.breach) {
    return res.redirect("/user/dashboard");
  }

  if (req.query.breach) {
    const reqBreachName = req.query.breach.toLowerCase();
    featuredBreach = req.app.locals.breaches.find(breach => breach.Name.toLowerCase() === reqBreachName);

    if (!featuredBreach) {
      return notFound(req, res);
    }

    const scanRes = await scanResult(req);

    if (scanRes.doorhangerScan) {
      return res.render("scan", Object.assign(scanRes, formTokens));
    }
    scanFeaturedBreach = true;

    return res.render("monitor", {
      title: req.fluentFormat("home-title"),
      featuredBreach: featuredBreach,
      scanFeaturedBreach,
      pageToken: formTokens.pageToken,
      csrfToken: formTokens.csrfToken,
      experimentBranch,
      experimentBranchB,
    });
  }

  res.render("monitor", {
    title: req.fluentFormat("home-title"),
    featuredBreach: featuredBreach,
    scanFeaturedBreach,
    pageToken: formTokens.pageToken,
    csrfToken: formTokens.csrfToken,
    experimentBranch,
    isUserInExperiment,
    experimentBranchB,
  });
}

function getExperimentBranch(req, sorterNum) {

  if (req.headers && !req.headers["accept-language"].includes("en") ){
    return false;
  }

  // If URL param has experimentBranch entry, use that branch;
  if (req.query.experimentBranch) {
    if (!["va", "vb"].includes(req.query.experimentBranch)) {
      return false;
    }
    req.session.experimentBranch = req.query.experimentBranch;
    return req.query.experimentBranch;
  }

  // If user was already assigned a branch, stay in that branch;
  if (req.session.experimentBranch) { return req.session.experimentBranch; }

  // Split into two categories
  if (sorterNum <= 50) {
    req.session.experimentBranch = "vb";
    return "vb";
  }

  return "va";
}

function getAllBreaches(req, res) {
  return res.render("top-level-page", {
    title: "Firefox Monitor",
    whichPartial: "top-level/all-breaches",
  });
}

function getSecurityTips(req, res) {
  return res.render("top-level-page", {
    title: req.fluentFormat("home-title"),
    whichPartial: "top-level/security-tips",
  });
}

function getAboutPage(req, res) {
  return res.render("about",{
    title: req.fluentFormat("about-firefox-monitor"),
  });
}

function getBentoStrings(req, res) {
  const localizedBentoStrings = {
    bentoButtonTitle: req.fluentFormat("bento-button-title"),
    bentoHeadline: req.fluentFormat("fx-makes-tech"),
    bentoBottomLink: req.fluentFormat("made-by-mozilla"),
    fxDesktop: req.fluentFormat("fx-desktop"),
    fxLockwise: req.fluentFormat("fx-lockwise"),
    fxMobile: req.fluentFormat("fx-mobile"),
    fxMonitor: req.fluentFormat("fx-monitor"),
    pocket: req.fluentFormat("pocket"),
    fxSend: req.fluentFormat("fx-send"),
    mobileCloseBentoButtonTitle: req.fluentFormat("mobile-close-bento-button-title"),
  };
  return res.json(localizedBentoStrings);
}

function protectMyEmail(req, res) {
  return res.render("private-relay", {
    title: req.fluentFormat("home-title"),
  });
}

function _addEmailRelayToWaitlistsJoined(user) {
  if (!user.waitlists_joined) {
    return {"email_relay": {"notified": false} };
  }
  user.waitlists_joined["email_relay"] = {"notified": false };
  return user.waitlists_joined;
}

function addEmailToRelayWaitlist(req, res) {
  const user = req.user;
  const updatedWaitlistsJoined = _addEmailRelayToWaitlistsJoined(user);
  DB.setWaitlistsJoined({user, updatedWaitlistsJoined});
  return res.json("email-added");
}

function notFound(req, res) {
  res.status(404);
  res.render("subpage", {
    analyticsID: "error",
    headline: req.fluentFormat("error-headline"),
    subhead: req.fluentFormat("home-not-found"),
  });
}

module.exports = {
  home,
  getAboutPage,
  getAllBreaches,
  getBentoStrings,
  getSecurityTips,
  protectMyEmail,
  addEmailToRelayWaitlist,
  notFound,
};
