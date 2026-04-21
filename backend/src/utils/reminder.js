const buildReminderMessage = (template, { name, amount, businessName }) => {
  let msg = template || '';
  msg = msg.replace(/\[Name\]/g, name || '');
  msg = msg.replace(/\[Amount\]/g, String(amount != null ? amount.toFixed(2) : ''));
  msg = msg.replace(/\[Business Name\]/g, businessName || '');
  return msg;
};

// Stub sender – integrate real SMS/WhatsApp/Email provider later
const sendReminderMessage = async ({ channel, to, message }) => {
  console.log(`[REMINDER] Sending via ${channel} to ${to}: ${message}`);

  return {
    success: true,
  };
};

module.exports = {
  buildReminderMessage,
  sendReminderMessage,
};

