import { Types } from '@ohif/core';

import getDataSourcesModule from './getDataSourcesModule.js';
import { id } from './id.js';

const defaultExtension: Types.Extensions.Extension = {
  /**
   * Only required property. Should be a unique value across all extensions.
   */
  id,
  getDataSourcesModule,
};

export default defaultExtension;
