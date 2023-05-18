import { createGCPDicomWebApi } from './GCPDicomWebDataSource/index.js';

/**
 *
 */
function getDataSourcesModule() {
  return [
    {
      name: 'gcpdicomweb',
      type: 'webApi',
      createDataSource: createGCPDicomWebApi,
    },
  ];
}

export default getDataSourcesModule;
