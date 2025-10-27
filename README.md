<div align="center">

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![GitHub release](https://img.shields.io/github/v/release/Edirom/Edirom-Online-Frontend.svg)](https://github.com/Edirom/Edirom-Online-Frontend/releases)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.15013104.svg)](https://doi.org/10.5281/zenodo.15013104)
[![fair-software.eu](https://img.shields.io/badge/fair--software.eu-%E2%97%8F%20%20%E2%97%8F%20%20%E2%97%8B%20%20%E2%97%8F%20%20%E2%97%8B-orange)](https://fair-software.eu)


</div>


## Get started

Edirom-Online Frontend is the frontend for the [Edirom-Online](https://github.com/Edirom/Edirom-Online) software. It is a web application written in JavaScript, and is designed for deployment in [eXist-db]. Its development is closely connected to the [Edirom-Online Frontend](https://github.com/Edirom/Edirom-Online-Frontend) and the Edirom-Online as a whole. Please see the GitHub repository for [Edirom-Online](https://github.com/Edirom/Edirom-Online) for planning information, issue listings, and further documentation. 

### Cloning this repository

```bash
git clone <project url>
```

### Building locally

For building Edirom Online you need *ant* installed on your system. 
Alternatively, you can use a Docker container image for building, e.g. [bwbohl/sencha-cmd]

```bash
docker run --rm -it -v /ABSOLUTE/PATH/TO/YOUR/LOCAL/EDIROM-ONLINE-FRONTEND/CLONE:/app --name ediBuild ghcr.io/bwbohl/sencha-cmd:latest
```

When you have your system prepared with all prerequisites or you have your docker container running you are now set up to execute the build command. Do this by calling the build script included in this repository, either in your native shell or in the container shell, e.g.:

```bash
./build.sh
```

#### Overriding build properties locally

Build properties can be overridden by creating a `local.properties` file in the root directory. This file allows you to customize any Ant properties without modifying the build script.

Available properties for override:
- `backend.protocol` (default: `http`)
- `backend.host` (default: `localhost`)
- `backend.port` (default: `8080`)
- `backend.path` (default: `/exist/apps/Edirom-Online-Backend/`)
- `project.version` (default: `1.1.0`)
- `project.app` (default: `Edirom-Online-Frontend`)
- `project.title` (default: `Edirom-Online Frontend`)
- `repo.target` (default: `Edirom-Online-Frontend`)
- `build.dir` (default: `build`)
- `dist.dir` (default: `build-xar`)
- `temp.dir.name` (default: `temp`)
- `euryanthe.dir` (default: `build-euryanthe`)
- `exist.dir` (default: `exist-packaging`)

Example `local.properties`:
```properties
backend.protocol=https
backend.host=my-custom-host
backend.port=9090
project.version=2.0.0
```


### Starting an Edirom instance locally

* prepare **exist-db**
  * also see [exist-db via Docker]
  * `docker run -it -d -p 8080:8080 -p 8443:8443 --name exist stadlerpeter/existdb:6` (see stadlerpeter/existdb)
  * open in browser: `http://localhost:8080` (Note: there were problems opening this in Safari)
  * Login with "admin:[empty]"
* build and deploy **xar of Edirom-Online Backend**
  * also see [building locally] above
  * at `http://localhost:8080/exist/apps/dashboard/admin#` (signed-in) go to "Package Manager" then "Upload" and select the xar file which (supposed above build-method was used) was built at `/PATH_TO_LOCAL_EDIROM_REPO/build-xar/Edirom-Online-Backend-1.1.0-[TIMESTAMP].xar`
* build and deploy **xar of Edirom-Online Frontend**
  * for building the frontend module please see https://github.com/Edirom/Edirom-Online-Frontend
  * at `http://localhost:8080/exist/apps/dashboard/admin#` (signed-in) go to "Package Manager" then "Upload" and select the xar file which (supposed above build-method was used) was built at `/PATH_TO_LOCAL_EDIROM_REPO/build-xar/Edirom-Online-Frontend-1.1.0-[TIMESTAMP].xar`
* build **xar of sample data** for deploying at exist-db
  * also see [building sample data]
  * at `http://localhost:8080/exist/apps/dashboard/admin#` (signed-in) go to "Package Manager" then "Upload" and select the xar file which (supposed above build-method was used) was built at `/PATH_TO_LOCAL_EDIROM_EDITION_EXAMPLE_REPO/build/EditionExample-0.1.1.xar`
* in **eXist-db Package Manager** click on the "Edirom Online Frontend" entry - you will be directed to the running Edirom at `http://localhost:8080/exist/apps/Edirom-Online-Frontend/index.html`

## Documentation

Some useful information regarding documentation is captured in the [docs](https://github.com/Edirom/Edirom-Online/tree/develop/docs) folder of the Edirom-Online repo. It contains:
* Customize Edirom Online and content
* Edirom Online – Release Workflow
* Setup Edirom Online on a local machine
* a data creation workflow for the Edirom-Online

## Dependencies

Edirom-Online Frontend depends on the following libraries:

* ./.


## Roadmap

Versions of this software are planned in [Edirom-Online milestones](https://github.com/Edirom/Edirom-Online/milestones). 

## Contributing

After all this information, you decided to contribute to Edirom-Online Frontend, that is awesome! We prepared a [CONTRIBUTING] file to help start your Edirom-Aventure now.

If you encounter a security issue in the code, please see the [Security Policy](.github/SECURITY.md) for further guidance.

## Get in touch

Even if you are not ready (yet) to contribute to this wonderful project, maybe instead you just have a question or want to get to know the people involved in the project a little better, here are some ideas for you: 
* there is an [Edirom mailinglist] with the option for selfsubscription, we send invitations to the community meetings via this list and we have Edirom related discussions on this list
* the edirom community is meeting regularly every month at the first wednesday of a month, see the [wiki] for more information and meeting minutes
* start a discussion at [GitHub Discussions]

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct]. By participating in this project you agree to abide by its terms.

## Citation

Please cite the software/repository using the information provided under "Cite this repository" on the right hand side. The APA and BIBTeX citations are fed by information from the CITATION.cff file in this repository which you can also use as a source.
If you intend to cite unreleased branches or commits please use the commit hash in the citation. 

## License

Edirom-Online Frontend is released to the public under the terms of the [MIT] open source license.

[eXist-db]: https://exist-db.org/
[Edirom-Online milestones]: https://github.com/Edirom/Edirom-Online/milestones
[CONTRIBUTING]: CONTRIBUTING.md
[bwbohl/sencha-cmd]: https://github.com/bwbohl/sencha-cmd/pkgs/container/sencha-cmd
[exist-db via Docker]: https://exist-db.org/exist/apps/doc/docker
[building sample data]: https://github.com/Edirom/EditionExample?tab=readme-ov-file#building
[Edirom mailinglist]: https://lists.uni-paderborn.de/mailman/listinfo/edirom-l
[wiki]: https://github.com/Edirom/Edirom-Online/wiki
[GitHub Discussions]: https://github.com/Edirom/Edirom-Online/discussions
[Contributor Code of Conduct]: CODE_OF_CONDUCT.md
[MIT]: https://opensource.org/license/mit
