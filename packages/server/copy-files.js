const fs = require('fs-extra')
const path = require("path");
const replace = require('replace-in-file');

// fix long prisma loading times caused by scanning from process.cwd(), which returns "/" when run in electron
// (thus it scans all files on the computer.) See https://github.com/prisma/prisma/issues/8484
const options = {
    files: path.join(__dirname, "src", "generated", "client", "index.js"),
    from: "findSync(process.cwd()",
    to: `findSync(require('electron').app.getAppPath()`,
};

const results = replace.sync(options);
console.log('Replacement results:', results);

fs.copySync(path.join(__dirname, "app", "src", "generated"),
    path.join(__dirname, "dist", "generated"),{
    filter: (src, dest) => {
        // Prevent duplicate copy of query engine. It will already be in extraResources in electron-builder.yml
        if (src.match(/query_engine/) || src.match(/libquery_engine/) || src.match(/esm/)){
            return false;
        }
        return true;
    }
    });

fs.copySync(path.join(__dirname, "..", "client", "build"),
    path.join(__dirname, "dist", "client", "build"));


const checker = require('license-checker');
const {map} = require("lodash");

checker.init({
    start: path.join(__dirname),
    customPath: path.join(__dirname, "thirdPartyLicenseFormat.json"),
    production: true,
    excludePrivatePackages: true
}, function(err, serverPackages) {
    if (err) {
        console.error(err);
        process.exit(1);
    } else {

        checker.init({
            start: path.join(__dirname, "..", "client"),
            customPath: path.join(__dirname, "thirdPartyLicenseFormat.json"),
            production: true,
            excludePrivatePackages: true
        }, function(err, clientPackages) {
            if (err) {
                console.error(err);
                process.exit(1);
            } else {
                const packages = {
                    ...serverPackages,
                    ...clientPackages
                };

                const packageStrs = map(packages, ({licenses, licenseText}, nameAndVer) => {
                    return `Package: ${nameAndVer}
Licenses: ${licenses}
License text:
${licenseText}`;
                });

                const thirdPartyLicensesStr = packageStrs.join("\n\n------------------------\n\n");
                fs.writeFileSync("THIRD-PARTY-LICENSES.txt", thirdPartyLicensesStr);
            }
        })
    }
});
