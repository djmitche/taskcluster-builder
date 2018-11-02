const util = require('util');
const fs = require('fs');
const path = require('path');
const rimraf = util.promisify(require('rimraf'));
const mkdirp = util.promisify(require('mkdirp'));
const {quote} = require('shell-quote');
const tar = require('tar-fs');
const copy = require('recursive-copy');
const Stamp = require('../stamp');
// TODO: used?
const {gitClone, ensureDownload, dockerRun, dockerPull, dockerImages, dockerBuild, dockerRegistryCheck,
  serviceDockerImageTask, ensureDockerImage, ensureTask} = require('../utils');

// TODO: figure out why output contains bogus bd bf bytes
// TODO: use stamp hash in image name
// TODO: use a post-procesor to get image ID (not really necessary here?)
// TODO: export image to gstorage

const PACKER_IMAGE = 'hashicorp/packer:1.3.2';

exports.genericWorkerTasks = ({tasks, baseDir, spec, cfg, name, cmdOptions, repository, workDir}) => {
  const worker = repository.worker;

  ensureDockerImage(tasks, baseDir, PACKER_IMAGE);

  // NOTE: generic-worker uses Go's default "latest" versions, and thus cannot
  // be built reliably.  So, instead of building from source, we download a
  // release tarball from GitHub, based on the `release` configuration in the
  // spec.

  const releaseUrl = `https://github.com/${worker.release.owner}/${worker.release.repository}` +
    `/releases/download/${worker.release.tag}/generic-worker-linux-amd64`;
  ensureDownload({tasks, baseDir, url: releaseUrl, name: 'generic-worker-linux-amd64'});

  tasks.push({
    title: `Worker ${name} - Packer`,
    requires: [
      'download-generic-worker-linux-amd64',
      'download-generic-worker-linux-amd64-stamp',
      /*
      `repo-${name}-dir`,
      `repo-${name}-exact-source`,
      `repo-${name}-stamp`,
      */
    ],
    provides: [
      //`worker-${name}-built-app-dir`,
      //`worker-${name}-stamp`,
      `target-worker-${name}`,
    ],
    locks: ['docker'],
    run: async (requirements, utils) => {
      //const repoDir = requirements[`repo-${name}-dir`];
      //const revision = requirements[`repo-${name}-exact-source`].split('#')[1];
      const packerDir = path.join(workDir, 'packer');
      const tempDir = path.join(workDir, 'tmp');

      const stamp = new Stamp({step: 'worker-packer', version: 1}, {},
        requirements['download-generic-worker-linux-amd64-stamp']);
      const provides = {
        [`target-worker-${name}`]: stamp, // XXX temp
      };

      // if we've already built this gopath with this revision, we're done.
      if (stamp.dirStamped(workDir)) {
        return utils.skip({provides});
      }

      utils.step({title: 'Copy Packer Configuration'});

      await rimraf(packerDir);
      await copy('workers', packerDir, {dot: false});

      utils.step({title: 'Run Packer'});

      await rimraf(tempDir);
      await mkdirp(tempDir);

      const variables = {
        project_id: 'taskcluster-builder',
      };
      const variableFile = path.join(packerDir, 'vars.json');
      fs.writeFileSync(variableFile, JSON.stringify(variables));

      const userJsonFile = path.join(packerDir, 'user.json');
      fs.writeFileSync(userJsonFile, JSON.stringify(cfg.workers.gcp.builderKey), {mode: 0o600});
      try {
        await dockerRun({
          image: PACKER_IMAGE,
          command: ['build', '-var-file', '/packer/vars.json', 'generic-worker.json'],
          workingDir: '/packer',
          binds: [
            `${packerDir}:/packer`,
            `${tempDir}:/tmp`,
          ],
          env: [
            'GOOGLE_APPLICATION_CREDENTIALS=/packer/user.json',
            'PACKER_NO_COLOR=1',
            'CHECKPOINT_DISABLE=1',
          ],
          logfile: `${workDir}/packer.log`,
          utils,
          baseDir,
        });

        //stamp.stampDir(workDir);
        return provides;
      } finally {
        // be sure to delete this, since it contains credentials
        await rimraf(userJsonFile);
      }
    },
  });
};
