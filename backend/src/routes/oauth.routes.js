const express = require('express');
const crypto = require('node:crypto');
const passport = require('../config/passport');
const { issueExchange, redeemExchange } = require('../services/oauth-exchange.service');
const router = express.Router();
const cookieName = 'google_flow';
const cookieOptions = {httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax',path:'/api/auth/google'};
const defaultFrontend = process.env.FRONTEND_URL || 'http://localhost:5173';
function frontendOrigin(requested) {
  const allowed = [defaultFrontend,...(process.env.ALLOWED_ORIGINS || '').split(',')].map(v=>v.trim().replace(/\/$/,''));
  return allowed.includes(requested) ? requested : defaultFrontend.replace(/\/$/,'');
}

router.get('/google', (req,res,next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return res.redirect(`${frontendOrigin()}/auth?oauth_error=unavailable`);
  const origin = frontendOrigin(req.query.origin);
  const challenge = req.query.challenge;
  if (typeof challenge !== 'string' || !/^[a-f0-9]{64}$/.test(challenge)) return res.redirect(`${origin}/auth?oauth_error=restart`);
  const state = crypto.randomBytes(32).toString('hex');
  const duration = 10 * 60 * 1000;
  res.cookie(cookieName, {state,challenge,origin,expires:Date.now()+duration}, {...cookieOptions,signed:true,maxAge:duration});
  passport.authenticate('google',{scope:['profile','email'],session:false,state})(req,res,next);
});

router.get('/google/callback', (req,res,next) => {
  const flow = req.signedCookies[cookieName];
  const origin = frontendOrigin(flow?.origin);
  const state = req.query.state;
  res.clearCookie(cookieName,cookieOptions);
  if (!flow || !(flow.expires > Date.now()) || !/^[a-f0-9]{64}$/.test(flow.state) || typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state) || !crypto.timingSafeEqual(Buffer.from(state),Buffer.from(flow.state))) {
    return res.redirect(`${origin}/auth?oauth_error=state`);
  }
  if (req.query.error) return res.redirect(`${origin}/auth?oauth_error=cancelled`);
  passport.authenticate('google',{session:false},async (err,user)=>{
    if (err || !user) return res.redirect(`${origin}/auth?oauth_error=account`);
    try {
      const code = await issueExchange(user.id,flow.challenge);
      // This one-use code requires the verifier kept in the originating tab.
      res.set('Cache-Control','no-store').redirect(`${origin}/oauth-success#code=${code}`);
    } catch(error) { next(error); }
  })(req,res,next);
});

router.post('/google/exchange',async (req,res,next)=>{
  try {
    const result = await redeemExchange(req.body);
    res.set('Cache-Control','no-store').status(result.status).json(result.body);
  } catch(error) { next(error); }
});
module.exports = router;
