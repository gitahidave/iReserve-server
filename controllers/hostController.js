import axios from 'axios';
import User from '../models/User.js';

export const setupHostPayouts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'host' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only hosts can complete onboarding' });
    }

    const {
      businessName,
      settlementBank,
      accountNumber,
      accountName,
      primaryContactPhone,
      percentageCharge = 80,
      description,
    } = req.body;

    if (!businessName?.trim() || !settlementBank?.trim() || !accountNumber?.trim()) {
      return res.status(400).json({
        message: 'Business name, settlement bank, and account number are required',
      });
    }

    const paystackPayload = {
      business_name: businessName.trim(),
      settlement_bank: settlementBank.trim(),
      account_number: String(accountNumber).trim(),
      percentage_charge: Number(percentageCharge),
      description: description?.trim() || `${user.name}'s host payout account`,
      primary_contact: user.name?.trim() || 'Host',
      primary_contact_email: user.email,
      primary_contact_phone: String(primaryContactPhone || '').trim() || '',
      metadata: {
        userId: user._id.toString(),
        accountName: accountName?.trim() || user.name,
      },
    };

    const response = await axios.post('https://api.paystack.co/subaccount', paystackPayload, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const subaccountCode = response?.data?.data?.subaccount_code;

    if (!subaccountCode) {
      return res.status(400).json({ message: 'Paystack did not return a subaccount code' });
    }

    user.paystackSubaccountCode = subaccountCode;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Host onboarding completed successfully',
      paystackSubaccountCode: subaccountCode,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        paystackSubaccountCode: user.paystackSubaccountCode,
      },
    });
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    res.status(error.response?.status || 500).json({ message });
  }
};

export const getSupportedBanks = async (req, res) => {
  try {
    const response = await axios.get('https://api.paystack.co/bank', {
      params: {
        country: 'KE',
        use_cursor: false,
      },
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const banks = (response?.data?.data || []).map((bank) => ({
      code: bank.code,
      name: bank.name,
      country: bank.country,
      currency: bank.currency,
    }));

    const hasTestBank = banks.some(
      (bank) => bank.code === 'test-bank' || bank.name?.toLowerCase() === 'test bank'
    );

    const bankList = hasTestBank
      ? banks
      : [{ code: 'test-bank', name: 'Test Bank', country: 'KE', currency: 'KES' }, ...banks];

    res.status(200).json({
      success: true,
      banks: bankList,
    });
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    res.status(error.response?.status || 500).json({ message });
  }
};

export const onboardHost = async (req, res) => {
  return setupHostPayouts(req, res);
};
