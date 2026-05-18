const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool           = require('./db');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'https://localhost:3443/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email  = profile.emails?.[0]?.value;
        const nombre = profile.displayName;

        if (!email) return done(new Error('Google no proporcionó email'), null);

        let [rows] = await pool.query(
          'SELECT id, nombre, email, rol FROM usuario WHERE google_id = ? OR email = ?',
          [profile.id, email]
        );

        if (rows.length) {
          const usuario = rows[0];
          await pool.query(
            'UPDATE usuario SET google_id = ? WHERE id = ? AND google_id IS NULL',
            [profile.id, usuario.id]
          );
          return done(null, usuario);
        }

        const [result] = await pool.query(
          'INSERT INTO usuario (nombre, email, google_id, rol) VALUES (?, ?, ?, ?)',
          [nombre, email, profile.id, 'cliente']
        );

        const nuevoUsuario = { id: result.insertId, nombre, email, rol: 'cliente' };
        return done(null, nuevoUsuario);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, email, rol FROM usuario WHERE id = ?', [id]);
    done(null, rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
