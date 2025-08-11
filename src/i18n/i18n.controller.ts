import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { I18nService, LanguageConfig } from './i18n.service';

@ApiTags('Internationalization (i18n)')
@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  @Get('languages')
  @ApiOperation({
    summary: 'Get supported languages',
    description:
      'Get list of all supported languages with their configurations',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported languages retrieved successfully',
  })
  getSupportedLanguages(): LanguageConfig[] {
    return this.i18nService.getSupportedLanguages();
  }

  @Get('detect')
  @ApiOperation({
    summary: 'Detect user language',
    description: "Detect user's preferred language from Accept-Language header",
  })
  @ApiResponse({
    status: 200,
    description: 'Language detected successfully',
  })
  detectLanguage(@Headers('accept-language') acceptLanguage: string) {
    const detectedLanguage = this.i18nService.detectLanguage(acceptLanguage);
    const languageConfig = this.i18nService.getLanguageConfig(detectedLanguage);

    return {
      detectedLanguage,
      languageConfig,
      fallback: detectedLanguage === 'en',
    };
  }

  @Get('translate/:key')
  @ApiOperation({
    summary: 'Translate a single key',
    description: 'Translate a specific key to the requested language',
  })
  @ApiParam({ name: 'key', description: 'Translation key to translate' })
  @ApiQuery({
    name: 'lang',
    description: 'Target language code',
    required: false,
  })
  @ApiQuery({ name: 'ns', description: 'Namespace', required: false })
  @ApiResponse({
    status: 200,
    description: 'Translation retrieved successfully',
  })
  translateKey(
    @Param('key') key: string,
    @Query('lang') language: string = 'en',
    @Query('ns') namespace: string = 'common',
  ) {
    if (!this.i18nService.isValidLanguage(language)) {
      return {
        error: 'Invalid language code',
        supportedLanguages: this.i18nService
          .getSupportedLanguages()
          .filter((lang) => lang.enabled)
          .map((lang) => lang.code),
      };
    }

    const translation = this.i18nService.translate(key, language, namespace);

    return {
      key,
      language,
      namespace,
      translation,
      fallback: translation === key,
    };
  }

  @Post('translate/batch')
  @ApiOperation({
    summary: 'Translate multiple keys',
    description: 'Translate multiple keys at once for efficiency',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch translations retrieved successfully',
  })
  translateBatch(
    @Body()
    body: {
      keys: string[];
      language?: string;
      namespace?: string;
    },
  ) {
    const { keys, language = 'en', namespace = 'common' } = body;

    if (!this.i18nService.isValidLanguage(language)) {
      return {
        error: 'Invalid language code',
        supportedLanguages: this.i18nService
          .getSupportedLanguages()
          .filter((lang) => lang.enabled)
          .map((lang) => lang.code),
      };
    }

    const translations = this.i18nService.translateMultiple(
      keys,
      language,
      namespace,
    );

    return {
      language,
      namespace,
      translations,
      keysTranslated: Object.keys(translations).length,
    };
  }

  @Get('namespace/:namespace')
  @ApiOperation({
    summary: 'Get all translations for a namespace',
    description: 'Get all translations within a specific namespace',
  })
  @ApiParam({ name: 'namespace', description: 'Namespace to retrieve' })
  @ApiQuery({ name: 'lang', description: 'Language code', required: false })
  @ApiResponse({
    status: 200,
    description: 'Namespace translations retrieved successfully',
  })
  getNamespaceTranslations(
    @Param('namespace') namespace: string,
    @Query('lang') language: string = 'en',
  ) {
    if (!this.i18nService.isValidLanguage(language)) {
      return {
        error: 'Invalid language code',
        supportedLanguages: this.i18nService
          .getSupportedLanguages()
          .filter((lang) => lang.enabled)
          .map((lang) => lang.code),
      };
    }

    const translations = this.i18nService.getNamespaceTranslations(
      namespace,
      language,
    );

    return {
      namespace,
      language,
      translations,
      keyCount: Object.keys(translations).length,
    };
  }

  @Get('format/date')
  @ApiOperation({
    summary: 'Format date for locale',
    description: 'Format a date according to the specified locale',
  })
  @ApiQuery({ name: 'date', description: 'ISO date string to format' })
  @ApiQuery({ name: 'lang', description: 'Language code', required: false })
  @ApiQuery({
    name: 'format',
    description: 'Date format options',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Date formatted successfully',
  })
  formatDate(
    @Query('date') dateString: string,
    @Query('lang') language: string = 'en',
    @Query('format') format?: string,
  ) {
    if (!dateString) {
      return { error: 'Date parameter is required' };
    }

    if (!this.i18nService.isValidLanguage(language)) {
      return {
        error: 'Invalid language code',
        supportedLanguages: this.i18nService
          .getSupportedLanguages()
          .filter((lang) => lang.enabled)
          .map((lang) => lang.code),
      };
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { error: 'Invalid date format' };
    }

    let formatOptions: Intl.DateTimeFormatOptions = {};
    if (format) {
      try {
        formatOptions = JSON.parse(format);
      } catch {
        formatOptions = {}; // Use default if parsing fails
      }
    }

    const formattedDate = this.i18nService.formatDateTime(
      date,
      language,
      formatOptions,
    );

    return {
      originalDate: dateString,
      language,
      formatOptions,
      formattedDate,
    };
  }

  @Get('format/currency')
  @ApiOperation({
    summary: 'Format currency for locale',
    description: 'Format a currency amount according to the specified locale',
  })
  @ApiQuery({ name: 'amount', description: 'Amount to format' })
  @ApiQuery({ name: 'currency', description: 'Currency code', required: false })
  @ApiQuery({ name: 'lang', description: 'Language code', required: false })
  @ApiResponse({
    status: 200,
    description: 'Currency formatted successfully',
  })
  formatCurrency(
    @Query('amount') amountString: string,
    @Query('currency') currency: string = 'USD',
    @Query('lang') language: string = 'en',
  ) {
    if (!amountString) {
      return { error: 'Amount parameter is required' };
    }

    const amount = parseFloat(amountString);
    if (isNaN(amount)) {
      return { error: 'Invalid amount format' };
    }

    if (!this.i18nService.isValidLanguage(language)) {
      return {
        error: 'Invalid language code',
        supportedLanguages: this.i18nService
          .getSupportedLanguages()
          .filter((lang) => lang.enabled)
          .map((lang) => lang.code),
      };
    }

    const formattedCurrency = this.i18nService.formatCurrency(
      amount,
      currency,
      language,
    );

    return {
      originalAmount: amount,
      currency,
      language,
      formattedCurrency,
    };
  }

  @Get('templates/email/:templateName')
  @ApiOperation({
    summary: 'Get email template',
    description: 'Get localized email template with variables',
  })
  @ApiParam({ name: 'templateName', description: 'Email template name' })
  @ApiQuery({ name: 'lang', description: 'Language code', required: false })
  @ApiResponse({
    status: 200,
    description: 'Email template retrieved successfully',
  })
  getEmailTemplate(
    @Param('templateName') templateName: string,
    @Query('lang') language: string = 'en',
    @Body() variables?: Record<string, any>,
  ) {
    if (!this.i18nService.isValidLanguage(language)) {
      return {
        error: 'Invalid language code',
        supportedLanguages: this.i18nService
          .getSupportedLanguages()
          .filter((lang) => lang.enabled)
          .map((lang) => lang.code),
      };
    }

    const template = this.i18nService.getEmailTemplate(
      templateName,
      language,
      variables,
    );

    return {
      templateName,
      language,
      variables,
      template,
    };
  }

  @Get('templates/push/:templateName')
  @ApiOperation({
    summary: 'Get push notification template',
    description: 'Get localized push notification template',
  })
  @ApiParam({
    name: 'templateName',
    description: 'Push notification template name',
  })
  @ApiQuery({ name: 'lang', description: 'Language code', required: false })
  @ApiResponse({
    status: 200,
    description: 'Push notification template retrieved successfully',
  })
  getPushNotificationTemplate(
    @Param('templateName') templateName: string,
    @Query('lang') language: string = 'en',
    @Body() variables?: Record<string, any>,
  ) {
    if (!this.i18nService.isValidLanguage(language)) {
      return {
        error: 'Invalid language code',
        supportedLanguages: this.i18nService
          .getSupportedLanguages()
          .filter((lang) => lang.enabled)
          .map((lang) => lang.code),
      };
    }

    const template = this.i18nService.getPushNotificationTemplate(
      templateName,
      language,
      variables,
    );

    return {
      templateName,
      language,
      variables,
      template,
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get localization statistics',
    description: 'Get statistics about translation coverage and completeness',
  })
  @ApiResponse({
    status: 200,
    description: 'Localization statistics retrieved successfully',
  })
  getLocalizationStats() {
    return this.i18nService.getLocalizationStats();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get i18n service health',
    description: 'Get health status of the internationalization service',
  })
  @ApiResponse({
    status: 200,
    description: 'i18n service health retrieved successfully',
  })
  getI18nHealth() {
    const supportedLanguages = this.i18nService.getSupportedLanguages();
    const enabledLanguages = supportedLanguages.filter((lang) => lang.enabled);

    return {
      status: 'healthy',
      initialized: true,
      totalLanguages: supportedLanguages.length,
      enabledLanguages: enabledLanguages.length,
      defaultLanguage: 'en',
      namespaces: [
        'common',
        'auth',
        'booking',
        'events',
        'payments',
        'notifications',
        'errors',
      ],
      features: {
        translation: true,
        dateFormatting: true,
        currencyFormatting: true,
        numberFormatting: true,
        templates: true,
        rtlSupport: true,
        fallbackChain: true,
      },
      lastChecked: new Date().toISOString(),
    };
  }
}
