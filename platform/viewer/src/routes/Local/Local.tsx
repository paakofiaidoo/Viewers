import React, { useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import { useNavigate } from 'react-router-dom';
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

function Local({ modePath }: LocalProps) {
  const navigate = useNavigate();
  const dropzoneRef = useRef();
  const [dropInitiated, setDropInitiated] = React.useState(false);
  const [state, setState] = useState({});

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
    setState({ isLoading: true, failed: false });
    axios
      .request({
        url:
          'https://real-lizards-fold.loca.lt/rest/files?fileRef=s3://2023/05/21/4b63f39b-f20a-4c63-4aea-0b8e51773e34?name=files',
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
        const fileObjectsPromises = Object.values(zip.files).map(async data => {
          const blob = await data.async('blob');
          const fileExt = data.name.split('.').pop(); // get the file extension
          if (fileExt === 'png' || fileExt === 'jpg' || fileExt === 'jpeg') {
            return new File([await blob], data.name, {
              type: 'image/' + fileExt,
            });
          }
          return new File([await blob], data.name);
        });
        Promise.all(fileObjectsPromises)
          .then(fileObjects => {
            setState({ isLoading: false, fileObjects });
            onDrop(fileObjects);
          })
          .catch(error => {
            console.log(error);
          });
      })
      .catch(() => {
        setState({ isLoading: false, failed: true });
      });
  };
  // Set body style
  useEffect(() => {
    console.log('opens');
    downloadAndLoad();
    document.body.classList.add('bg-black');
    return () => {
      document.body.classList.remove('bg-black');
    };
  }, []);

  return (
    <Dropzone
      ref={dropzoneRef}
      onDrop={acceptedFiles => {
        setDropInitiated(true);
        onDrop(acceptedFiles);
      }}
      noClick
    >
      {({ getRootProps }) => (
        <div {...getRootProps()} style={{ width: '100%', height: '100%' }}>
          <div className="h-screen w-screen flex justify-center items-center ">
            <div className="py-8 px-8 mx-auto bg-secondary-dark drop-shadow-md space-y-2 rounded-lg">
              <img
                className="block mx-auto h-14"
                src="./ohif-logo.svg"
                alt="OHIF"
              />
              <div className="text-center space-y-2 pt-4">
                {dropInitiated ? (
                  <div className="flex flex-col items-center justify-center pt-48">
                    <LoadingIndicatorProgress
                      className={'w-full h-full bg-black'}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-blue-300 text-base">
                      Note: You data is not uploaded to any server, it will stay
                      in your local browser application
                    </p>
                    <p className="text-xg text-primary-active font-semibold pt-6">
                      Drag and Drop DICOM files here to load them in the Viewer
                    </p>
                    <p className="text-blue-300 text-lg">Or click to </p>
                  </div>
                )}
              </div>
              <div className="flex justify-around pt-4 ">
                {getLoadButton(onDrop, 'Load files', false)}
                {getLoadButton(onDrop, 'Load folders', true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Dropzone>
  );
}

export default Local;
