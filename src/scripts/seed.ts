import * as fs from "fs";
import * as path from "path";
import * as countryJs from "countryjs";
import * as countryList from "country-list";

interface IsoCodes {
    alpha2: Array<string>,
    alpha3: {
        [key: string]: string
    }
}

interface CountryData {
    alpha2: string;
    alpha3: string;
    names: Array<string>
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const dataDir = path.join(__dirname, "..", "..", "..", "data");
const countryDir = path.join(dataDir, "country");
const alpha2File = path.join(dataDir, "iso-alpha-2.json");
const alpha3File = path.join(dataDir, "iso-alpha-3.json");

const namesSeen : { [key: string]: string } = {};
const alpha2s: Array<string> = []
const alpha3s: {[key: string]: string} = {}

const loadCountryFile = function(file: string, alpha2: string, alpha3: string): CountryData {
    let data : CountryData = {
        alpha2,
        alpha3,
        names: []
    };

    try {
        const stat = fs.lstatSync(file);
        if (stat.isFile()) {
            data = JSON.parse(fs.readFileSync(file).toString());
        }
    } catch (err) {
        // Ignore file doesn't exist error as we'll create it
        if (err.code !== "ENOENT") {
            console.log(file);
            throw err;
        }
    }

    return data;
}

for (const letter1 of alphabet) {
    for (const letter2 of alphabet) {
        const info = countryJs.info(`${letter1}${letter2}`);
        if (info) {
            // ISO 3166
            const { alpha2, alpha3 } = info.ISO;
            alpha2s.push(alpha2);
            alpha3s[alpha3] = alpha2;

            // Load existing data
            const countryFile = path.join(countryDir, `${alpha2}.json`);
            const data = loadCountryFile(countryFile, alpha2, alpha3);

            // Populate a set so we don't duplicate
            const names = new Set(data.names);
            names.add(alpha2);
            names.add(alpha3);
            const countryListName = countryList.getName(alpha2);
            if (typeof countryListName === 'string') {
                names.add(countryListName);
            }
            names.add(info.name);
            names.add(info.nativeName);
            for (const alt of info.altSpellings) {
                names.add(alt);
            }

            // Empty names array so we don't duplicate
            data.names = [];

            // Put names back into names array
            for (const name of names.values()) {
                if (typeof name === 'string') {
                    if (namesSeen[name]) {
                        console.log(`CLASH! "${name}" [${alpha2}] has been seen for ${namesSeen[name]}`);
                    } else {
                        data.names.push(name);
                        namesSeen[name] = alpha2;
                    }
                }
            }

            fs.writeFileSync(countryFile, JSON.stringify(data, null, 2));
        }
    }
}

fs.writeFileSync(alpha2File, JSON.stringify(alpha2s, null, 2));
fs.writeFileSync(alpha3File, JSON.stringify(alpha3s, null, 2));

console.log("Seed complete...");
console.log(`* Countries: ${alpha2s.length};`);
console.log(`* Names: ${Object.keys(namesSeen).length}`);