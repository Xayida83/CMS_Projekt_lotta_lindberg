'use strict';

/**
 * display service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::display.display');
