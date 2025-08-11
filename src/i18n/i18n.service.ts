import { Injectable, Logger } from '@nestjs/common';

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  enabled: boolean;
}

export interface TranslationNamespace {
  common: any;
  auth: any;
  booking: any;
  events: any;
  payments: any;
  notifications: any;
  errors: any;
}

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);
  private translations = new Map<string, Map<string, any>>();
  private initialized = true;

  constructor() {
    this.initializeMockTranslations();
  }

  private initializeMockTranslations() {
    // Initialize with mock translations for testing
    const languages = ['en', 'th', 'es', 'fr', 'de', 'ja', 'ko', 'zh'];
    const namespaces = [
      'common',
      'auth',
      'booking',
      'events',
      'payments',
      'notifications',
      'errors',
    ];

    for (const lang of languages) {
      for (const ns of namespaces) {
        const key = `${lang}-${ns}`;
        const translationObject: any = {
          welcome: lang === 'en' ? 'Welcome' : `Welcome_${lang}`,
          'booking.confirmation':
            lang === 'en' ? 'Booking Confirmed' : `Booking_Confirmed_${lang}`,
          'error.notFound': lang === 'en' ? 'Not Found' : `Not_Found_${lang}`,
          'emails.confirmation.subject':
            lang === 'en'
              ? 'Booking Confirmation'
              : `Booking_Confirmation_${lang}`,
          'emails.confirmation.body':
            lang === 'en'
              ? 'Your booking has been confirmed'
              : `Your_booking_confirmed_${lang}`,
          'push.booking.title':
            lang === 'en' ? 'Booking Update' : `Booking_Update_${lang}`,
          'push.booking.body':
            lang === 'en'
              ? 'Your booking status has changed'
              : `Booking_status_changed_${lang}`,
        };
        this.translations.set(key, translationObject);
      }
    }

    this.logger.log('Mock i18n translations initialized successfully');
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): LanguageConfig[] {
    return [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        rtl: false,
        enabled: true,
      },
      {
        code: 'th',
        name: 'Thai',
        nativeName: 'ไทย',
        flag: '🇹🇭',
        rtl: false,
        enabled: true,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',
        rtl: false,
        enabled: true,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
        rtl: false,
        enabled: true,
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪',
        rtl: false,
        enabled: true,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        flag: '🇯🇵',
        rtl: false,
        enabled: true,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        flag: '🇰🇷',
        rtl: false,
        enabled: true,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        flag: '🇨🇳',
        rtl: false,
        enabled: true,
      },
    ];
  }

  /**
   * Translate text
   */
  translate(
    key: string,
    language: string = 'en',
    namespace: string = 'common',
    options?: any,
  ): string {
    if (!this.initialized) {
      this.logger.warn('i18n not initialized, returning key');
      return key;
    }

    try {
      const translationKey = `${language}-${namespace}`;
      const translations = this.translations.get(translationKey);

      if (!translations || !translations[key]) {
        // Fall back to English
        const englishKey = `en-${namespace}`;
        const englishTranslations = this.translations.get(englishKey);
        return englishTranslations?.[key] || key;
      }

      let translation = translations[key];

      // Simple variable interpolation
      if (options && typeof translation === 'string') {
        for (const [variable, value] of Object.entries(options)) {
          translation = translation.replace(`{{${variable}}}`, String(value));
        }
      }

      return translation;
    } catch (error) {
      this.logger.error(
        `Translation failed for key "${key}": ${error.message}`,
      );
      return key;
    }
  }

  /**
   * Get all translations for a namespace
   */
  getNamespaceTranslations(namespace: string, language: string = 'en'): any {
    if (!this.initialized) {
      return {};
    }

    try {
      const translationKey = `${language}-${namespace}`;
      return this.translations.get(translationKey) || {};
    } catch (error) {
      this.logger.error(
        `Failed to get namespace translations: ${error.message}`,
      );
      return {};
    }
  }

  /**
   * Get translations for multiple keys
   */
  translateMultiple(
    keys: string[],
    language: string = 'en',
    namespace: string = 'common',
  ): Record<string, string> {
    const translations: Record<string, string> = {};

    for (const key of keys) {
      translations[key] = this.translate(key, language, namespace);
    }

    return translations;
  }

  /**
   * Detect language from request headers
   */
  detectLanguage(acceptLanguageHeader: string): string {
    const supportedLanguages = this.getSupportedLanguages()
      .filter((lang) => lang.enabled)
      .map((lang) => lang.code);

    if (!acceptLanguageHeader) {
      return 'en'; // Default fallback
    }

    // Parse Accept-Language header
    const languages = acceptLanguageHeader
      .split(',')
      .map((lang) => {
        const parts = lang.trim().split(';');
        const code = parts[0].toLowerCase();
        const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
        return { code, quality };
      })
      .sort((a, b) => b.quality - a.quality);

    // Find first supported language
    for (const lang of languages) {
      const shortCode = lang.code.substring(0, 2);
      if (supportedLanguages.includes(shortCode)) {
        return shortCode;
      }
    }

    return 'en'; // Default fallback
  }

  /**
   * Get formatted date/time for locale
   */
  formatDateTime(
    date: Date,
    language: string = 'en',
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    };

    try {
      return new Intl.DateTimeFormat(language, defaultOptions).format(date);
    } catch (error) {
      this.logger.error(`Date formatting failed: ${error.message}`);
      // Return safe fallback for invalid dates
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toISOString();
    }
  }

  /**
   * Format currency for locale
   */
  formatCurrency(
    amount: number,
    currency: string = 'USD',
    language: string = 'en',
  ): string {
    try {
      return new Intl.NumberFormat(language, {
        style: 'currency',
        currency,
      }).format(amount);
    } catch (error) {
      this.logger.error(`Currency formatting failed: ${error.message}`);
      return `${amount} ${currency}`;
    }
  }

  /**
   * Format number for locale
   */
  formatNumber(
    number: number,
    language: string = 'en',
    options?: Intl.NumberFormatOptions,
  ): string {
    try {
      return new Intl.NumberFormat(language, options).format(number);
    } catch (error) {
      this.logger.error(`Number formatting failed: ${error.message}`);
      return number.toString();
    }
  }

  /**
   * Get localized error messages
   */
  getErrorMessage(
    errorCode: string,
    language: string = 'en',
    context?: any,
  ): string {
    return this.translate(errorCode, language, 'errors', context);
  }

  /**
   * Get localized validation messages
   */
  getValidationMessage(
    field: string,
    rule: string,
    language: string = 'en',
    context?: any,
  ): string {
    const key = `validation.${field}.${rule}`;
    return this.translate(key, language, 'common', context);
  }

  /**
   * Get email templates in different languages
   */
  getEmailTemplate(
    templateName: string,
    language: string = 'en',
    variables?: Record<string, any>,
  ): { subject: string; body: string } {
    const subjectKey = `emails.${templateName}.subject`;
    const bodyKey = `emails.${templateName}.body`;

    return {
      subject: this.translate(subjectKey, language, 'notifications', variables),
      body: this.translate(bodyKey, language, 'notifications', variables),
    };
  }

  /**
   * Get SMS templates in different languages
   */
  getSMSTemplate(
    templateName: string,
    language: string = 'en',
    variables?: Record<string, any>,
  ): string {
    const key = `sms.${templateName}`;
    return this.translate(key, language, 'notifications', variables);
  }

  /**
   * Get push notification templates
   */
  getPushNotificationTemplate(
    templateName: string,
    language: string = 'en',
    variables?: Record<string, any>,
  ): { title: string; body: string } {
    const titleKey = `push.${templateName}.title`;
    const bodyKey = `push.${templateName}.body`;

    return {
      title: this.translate(titleKey, language, 'notifications', variables),
      body: this.translate(bodyKey, language, 'notifications', variables),
    };
  }

  /**
   * Get localization statistics
   */
  getLocalizationStats(): any {
    const supportedLanguages = this.getSupportedLanguages();
    const enabledLanguages = supportedLanguages.filter((lang) => lang.enabled);

    return {
      totalLanguages: supportedLanguages.length,
      enabledLanguages: enabledLanguages.length,
      disabledLanguages: supportedLanguages.length - enabledLanguages.length,
      namespaces: [
        'common',
        'auth',
        'booking',
        'events',
        'payments',
        'notifications',
        'errors',
      ],
      rtlLanguages: supportedLanguages.filter((lang) => lang.rtl).length,
      languages: supportedLanguages.map((lang) => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        enabled: lang.enabled,
        rtl: lang.rtl,
        completeness: this.getTranslationCompleteness(lang.code),
      })),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get translation completeness percentage for a language
   */
  private getTranslationCompleteness(languageCode: string): number {
    if (!this.initialized || languageCode === 'en') {
      return 100; // English is considered 100% complete as the base language
    }

    try {
      const namespaces = [
        'common',
        'auth',
        'booking',
        'events',
        'payments',
        'notifications',
        'errors',
      ];
      let totalKeys = 0;
      let translatedKeys = 0;

      for (const namespace of namespaces) {
        const englishKey = `en-${namespace}`;
        const targetKey = `${languageCode}-${namespace}`;

        const englishBundle = this.translations.get(englishKey) || {};
        const targetBundle = this.translations.get(targetKey) || {};

        const englishKeyCount = this.countKeys(englishBundle);
        const targetKeyCount = this.countKeys(targetBundle);

        totalKeys += englishKeyCount;
        translatedKeys += Math.min(targetKeyCount, englishKeyCount);
      }

      return totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;
    } catch (error) {
      this.logger.error(
        `Failed to calculate translation completeness: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Recursively count keys in translation object
   */
  private countKeys(obj: any): number {
    let count = 0;
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        count += this.countKeys(obj[key]);
      } else {
        count++;
      }
    }
    return count;
  }

  /**
   * Validate language code
   */
  isValidLanguage(languageCode: string): boolean {
    const supportedCodes = this.getSupportedLanguages()
      .filter((lang) => lang.enabled)
      .map((lang) => lang.code);
    return supportedCodes.includes(languageCode);
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(languageCode: string): LanguageConfig | null {
    const languages = this.getSupportedLanguages();
    return languages.find((lang) => lang.code === languageCode) || null;
  }
}
