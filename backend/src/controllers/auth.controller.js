const { User, USER_ROLES } = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken, verifyToken } = require('../utils/jwt');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validation/auth.validation');

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const signup = async (req, res) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, email, password, role } = value;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || USER_ROLES.ADMIN,
    });

    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[AUTH] signup error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = value;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[AUTH] login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email } = value;

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal whether user exists
      return res.json({ message: 'If that email exists, a reset link will be sent.' });
    }

    const token = signToken(
      { sub: user._id.toString(), type: 'password_reset' },
      { expiresIn: '1h' }
    );

    // TODO: integrate email service; for now we return token for dev usage.
    return res.json({
      message: 'Password reset token generated',
      token,
    });
  } catch (err) {
    console.error('[AUTH] forgotPassword error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { token, newPassword } = value;

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (payload.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid reset token type' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    return res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('[AUTH] resetPassword error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
};

