import React, { useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { DicomMetadataStore, MODULE_TYPES } from '@ohif/core';
import axios from 'axios';
import Dropzone from 'react-dropzone';
import filesToStudies from './filesToStudies';
import JSZip from 'jszip';

import { extensionManager } from '../../App.tsx';

import { Icon, Button, LoadingIndicatorProgress } from '@ohif/ui';

const getLoadButton = (onDrop, text, isDir) => {
  return (
    <Dropzone onDrop={onDrop} noDrag>
      {({ getRootProps, getInputProps }) => (
        <div {...getRootProps()}>
          <Button
            rounded="full"
            variant="contained" // outlined
            disabled={false}
            endIcon={<Icon name="launch-arrow" />} // launch-arrow | launch-info
            className={classnames('font-medium', 'ml-2')}
            onClick={() => {}}
          >
            {text}
            {isDir ? (
              <input
                {...getInputProps()}
                webkitdirectory="true"
                mozdirectory="true"
              />
            ) : (
              <input {...getInputProps()} />
            )}
          </Button>
        </div>
      )}
    </Dropzone>
  );
};

type LocalProps = {
  modePath: string;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function Local({ modePath }: LocalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const url = new URLSearchParams(location.search).get('file');
  const dropzoneRef = useRef();
  const [dropInitiated, setDropInitiated] = React.useState(false);
  const [state, setState] = useState({
    isLoading: false,
    failed: false,
    fileObjects: [],
  });

  // Initializing the dicom local dataSource
  const dataSourceModules = extensionManager.modules[MODULE_TYPES.DATA_SOURCE];
  const localDataSources = dataSourceModules.reduce((acc, curr) => {
    const mods = [];
    curr.module.forEach(mod => {
      if (mod.type === 'localApi') {
        mods.push(mod);
      }
    });
    return acc.concat(mods);
  }, []);

  const firstLocalDataSource = localDataSources[0];
  const dataSource = firstLocalDataSource.createDataSource({});

  const microscopyExtensionLoaded = extensionManager.registeredExtensionIds.includes(
    '@ohif/extension-dicom-microscopy'
  );

  const onDrop = async acceptedFiles => {
    const studies = await filesToStudies(acceptedFiles, dataSource);

    const query = new URLSearchParams();

    // if (microscopyExtensionLoaded) {
    //   // TODO: for microscopy, we are forcing microscopy mode, which is not ideal.
    //   //     we should make the local drag and drop navigate to the worklist and
    //   //     there user can select microscopy mode
    //   const smStudies = studies.filter(id => {
    //     const study = DicomMetadataStore.getStudy(id);
    //     return (
    //       study.series.findIndex(
    //         s => s.Modality === 'SM' || s.instances[0].Modality === 'SM'
    //       ) >= 0
    //     );
    //   });

    //   if (smStudies.length > 0) {
    //     smStudies.forEach(id => query.append('StudyInstanceUIDs', id));

    //     modePath = 'microscopy';
    //   }
    // }

    // Todo: navigate to work list and let user select a mode
    studies.forEach(id => query.append('StudyInstanceUIDs', id));
    query.append('datasources', 'dicomlocal');

    navigate(`/${modePath}?${decodeURIComponent(query.toString())}`);
  };

  const downloadAndLoad = () => {
    console.log(url);
    if (url) {
      setState({ ...state, isLoading: true, failed: false });
      axios
        .request({
          url,
          method: 'GET',
          responseType: 'arraybuffer',
        })
        .then(response => {
          // Extract the zip file using JSZip
          const zip = new JSZip();
          return zip.loadAsync(response.data);
        })
        .then(zip => {
          // Get the file names from the zip and set to state
          const fileObjectsPromises = Object.values(zip.files).map(
            async data => {
              const blob = await data.async('blob');
              const fileExt = data.name.split('.').pop(); // get the file extension
              if (
                fileExt === 'png' ||
                fileExt === 'jpg' ||
                fileExt === 'jpeg'
              ) {
                return new File([await blob], data.name, {
                  type: 'image/' + fileExt,
                });
              }
              return new File([await blob], data.name);
            }
          );
          Promise.all(fileObjectsPromises)
            .then(fileObjects => {
              setState({ ...state, isLoading: false, fileObjects });
              onDrop(fileObjects);
            })
            .catch(error => {
              console.log(error);
            });
        })
        .catch(() => {
          setState({ ...state, isLoading: false, failed: true });
        });
    }
  };
  // Set body style
  useEffect(() => {
    downloadAndLoad();
    // document.body.classList.add('bg-black');
    // return () => {
    //   document.body.classList.remove('bg-black');
    // };
  }, []);

  return (
    <div className="h-screen w-screen flex justify-center items-center ">
      <div className="py-8 px-8 mx-auto bg-secondary-dark drop-shadow-md space-y-2 rounded-lg">
        <div className="text-center space-y-2 pt-4">
          <div className="space-y-2">
            <p className="text-xg text-primary-active font-semibold pt-6">
              {state.isLoading
                ? 'Getting Files ...'
                : state.failed
                ? 'Error Getting files'
                : 'Opening Images ....'}
              {state.isLoading && (
                <LoadingIndicatorProgress
                  className={'w-full h-full bg-black'}
                />
              )}
            </p>
            <button
              className={classnames('font-medium', 'ml-2')}
              onClick={downloadAndLoad}
            >
              Retry
            </button>
            <hr />
            <button
              className={classnames('font-medium', 'ml-2')}
              onClick={() => {}}
            >
              <a
                href={url + '.zip'}
                download
                className="text-900 w-full md:w-2"
              >
                Download Files Locally
              </a>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // return (
  //   <Dropzone
  //     ref={dropzoneRef}
  //     onDrop={acceptedFiles => {
  //       setDropInitiated(true);
  //       onDrop(acceptedFiles);
  //     }}
  //     noClick
  //   >
  //     {({ getRootProps }) => (
  //       <div {...getRootProps()} style={{ width: '100%', height: '100%' }}>
  //         <div className="h-screen w-screen flex justify-center items-center ">
  //           <div className="py-8 px-8 mx-auto bg-secondary-dark drop-shadow-md space-y-2 rounded-lg">
  //             <div className="text-center space-y-2 pt-4">
  //               {dropInitiated ? (
  //                 <div className="flex flex-col items-center justify-center pt-48">
  //                   <LoadingIndicatorProgress
  //                     className={'w-full h-full bg-black'}
  //                   />
  //                 </div>
  //               ) : (
  //                 <div className="space-y-2">
  //                   <p className="text-blue-300 text-base">
  //                     Note: You data is not uploaded to any server, it will stay
  //                     in your local browser application
  //                   </p>
  //                   <p className="text-xg text-primary-active font-semibold pt-6">
  //                     Drag and Drop DICOM files here to load them in the Viewer
  //                   </p>
  //                   <p className="text-blue-300 text-lg">Or click to </p>
  //                 </div>
  //               )}
  //             </div>
  //             <div className="flex justify-around pt-4 ">
  //               {getLoadButton(onDrop, 'Load files', false)}
  //               {getLoadButton(onDrop, 'Load folders', true)}
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     )}
  //   </Dropzone>
  // );
}

export default Local;
