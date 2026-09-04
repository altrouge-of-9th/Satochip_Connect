import { SatochipCard } from 'satochip-react-native';
import { Platform } from 'react-native';
import { useState } from 'react';

export const SATOCHIP_NFC_MAX_ATTEMPTS = 3;
export const SATOCHIP_NFC_READY_MESSAGE = 'Please hold the card near the phone...';
export const SATOCHIP_NFC_RETRY_MESSAGE = 'Card connection lost. Keep holding the card near the phone...';

const getErrorStatusWord = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const statusWord = (error as { statusWord?: unknown }).statusWord;
  if (typeof statusWord === 'number') {
    return statusWord;
  }

  const originalError = (error as { originalError?: unknown }).originalError;
  return getErrorStatusWord(originalError);
};

export const isNonRetryableCardError = (error: unknown): boolean => {
  const statusWord = getErrorStatusWord(error);
  if (statusWord === undefined) {
    return false;
  }

  return new Set([
    0x6700, // SW_WRONG_LENGTH
    0x9c01, // SW_NO_MEMORY_LEFT
    0x9c03, // SW_OPERATION_NOT_ALLOWED
    0x9c04, // SW_SETUP_NOT_DONE
    0x9c05, // SW_UNSUPPORTED_FEATURE
    0x9c06, // SW_UNAUTHORIZED
    0x9c07, // SW_SETUP_ALREADY_DONE
    0x9c09, // SW_INCORRECT_ALG
    0x9c0b, // SW_SIGNATURE_INVALID
    0x9c0c, // SW_IDENTITY_BLOCKED
    0x9c0f, // SW_INVALID_PARAMETER
    0x9c10, // SW_INCORRECT_P1
    0x9c11, // SW_INCORRECT_P2
    0x9c13, // SW_INCORRECT_INITIALIZATION
    0x9c14, // SW_BIP32_UNINITIALIZED_SEED
    0x9c15, // SW_INCORRECT_TXHASH
    0x9c17, // SW_BIP32_INITIALIZED_SEED
    0x9c18, // SW_2FA_INITIALIZED_KEY
    0x9c19, // SW_2FA_UNINITIALIZED_KEY
  ]).has(statusWord) || (statusWord & 0xfff0) === 0x63c0;
};

const useSatochipModal = (card: SatochipCard) => {
  const [nfcVisible, setNfcVisible] = useState<boolean>(false);
  const [nfcMessage, setNfcMessage] = useState(SATOCHIP_NFC_READY_MESSAGE);

  const withModal = (callback) =>
    Platform.select({
      android: async () => {
        setNfcVisible(true);
        try {
          for (let attempt = 1; attempt <= SATOCHIP_NFC_MAX_ATTEMPTS; attempt += 1) {
            try {
              setNfcMessage(SATOCHIP_NFC_READY_MESSAGE);
              const resp = await card.nfcWrapper(callback);
              return resp;
            } catch (error) {
              if (
                isNonRetryableCardError(error) ||
                attempt === SATOCHIP_NFC_MAX_ATTEMPTS
              ) {
                throw error;
              }

              setNfcMessage(SATOCHIP_NFC_RETRY_MESSAGE);
              await card.endNfcSession().catch(() => undefined);
            }
          }

          throw new Error('NFC signing attempts exhausted');
        } finally {
          setNfcVisible(false);
        }
      },
      ios: async () => card.nfcWrapper(callback),
    });

  const closeNfc = () => setNfcVisible(false);
  
  return { nfcVisible, nfcMessage, withModal, closeNfc };
};

export default useSatochipModal;
