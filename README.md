# H5P Portfolio

H5P content type that allows students to create portfolios.

PLEASE NOTE: THIS CONTENT TYPE IS THE RESULT OF CONTRACT WORK WITH SPECIFIC
REQUIREMENTS THAT MAY NOT MATCH YOUR OWN EXPECTATIONS. WHILE OLIVER IS THE
DEVELOPER, HE'S MERELY THE CONTRACTOR WHO ALSO HAPPENED TO PLEAD FOR MAKING THIS
CONTENT TYPE OPENLY AVAILABLE - SO YOU CAN USE IT FOR FREE. HOWEVER, HE IS NOT
SUPPOSED TO PROVIDE FREE SUPPORT, ACCEPT FEATURE REQUESTS OR PULL REQUESTS. HE
MAY DO SO, AND HE WILL PROBABLY ALSO CONTINUE WORKING ON THE CONTENT TYPE, BUT
AT HIS OWN PACE.

## Getting started
Clone this repository with git and check out the branch that you are interested
in (or choose the branch first and then download the archive, but learning
how to use git really makes sense).

Also ensure to clone related repositories that hold complementary components if
you want to change those:
- [Main Portfolio view component](https://github.com/otacke/h5p-portfolio)
- [View component for a chapter](https://github.com/otacke/h5p-portfolio-chapter)
- [View component for a placeholder block](https://github.com/otacke/h5p-portfolio-placeholder)
- [Main Portfolio editor component](https://github.com/otacke/h5p-editor-portfolio)
- [Editor component for a chapter](https://github.com/otacke/h5p-editor-portfolio-chapter)
- [Editor component for a placeholder block](https://github.com/otacke/h5p-editor-portfolio-placeholder)
- [Optional subcontent for offering files for download](https://github.com/otacke/h5p-file-for-download)

Change to the repository directory and run
```bash
npm install
```

to install required modules. Afterwards, you can build the project using
```bash
npm run build
```

or, if you want to let everything be built continuously while you are making
changes to the code, run
```bash
npm run watch
```
Before putting the code in production, you should always run `npm run build`.

The build process will transpile ES6 to earlier versions in order to improve
compatibility to older browsers. If you want to use particular functions that
some browsers don't support, you'll have to add a polyfill.

The build process will also move the source files into one distribution file and
minify the code.

In order to lint your code in order to detect H5P coding style guide viloations,
use:
```bash
npm run lint
```
In order to pack an H5P library, please install the
[H5P CLI tool](https://h5p.org/h5p-cli-guide) instead of zipping everything
manually. That tool will take care of a couple of things automatically that you
will need to know otherwise.

In simple cases, something such as
```bash
h5p pack <your-repository-directory> my-awesome-library.h5p
```
will suffice.

For more information on how to use those distribution files in H5P, please have
a look at https://youtu.be/xEgBJaRUBGg and the H5P developer guide at
https://h5p.org/library-development.
