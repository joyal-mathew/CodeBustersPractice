(async () => {
    "use strict";

    function makeKey(s) {
        const key = {};

        Array.from(s).forEach((c, i) => key[alphabet[i]] = c);

        return key;
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    function makeMat(s) {
        if (s.length == 4) {
            return [
                [ alphabet.indexOf(s[0]), alphabet.indexOf(s[1]) ],
                [ alphabet.indexOf(s[2]), alphabet.indexOf(s[3]) ]
            ];
        }

        return s.split(/ /g).map(r => Array.from(r).map(c => alphabet.indexOf(c)));
    }

    function choice(arr) {
        return arr[randInt(0, arr.length)];
    }

    const phrases = await fetch("data/phrases.json").then(res => res.json());
    const paragraphs = await fetch("data/paragraphs.json").then(res => res.json());
    const fourLetterWords = await fetch("data/words4L.json").then(res => res.json());
    const threeLetterWords = await fetch("data/words3L.json").then(res => res.json());

    const nameElem = document.getElementById("name");
    const plaintextElem = document.getElementById("plaintext");
    const ciphertextElem = document.getElementById("ciphertext");
    const keyElem = document.getElementById("key");
    const keyShowElem = document.getElementById("showkey");
    const plaintextShowElem = document.getElementById("showplaintext");

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const puzzle = {
        plaintext: "HELLO, WORLD!",
        ciphertext: "",
        key: "",
    };

    plaintextShowElem.onclick = () => plaintextElem.style.display = "block";
    keyShowElem.onclick = () => keyElem.style.display = "block";

    let generated = false;

    const nameMap = {
        "atbash": "Atbash",
        "caesar": "Caesar",
        "monoalphabetic": "Monoalphabetic",
        "monoalphabeticNoSpaces": "Monoalphabetic (No Spaces)",
        "affine": "Affine",
        "vigenere": "Vigenere",
        "baconian": "Baconian",
        "hill": "Hill",
    };

    const funcMap = {
        "atbash": atbash,
        "caesar": caesar,
        "monoalphabetic": monoalphabetic,
        "monoalphabeticNoSpaces": monoalphabeticNoSpaces,
        "affine": affine,
        "vigenere": vigenere,
        "baconian": baconian,
        "hill": hill,
    };

    document.getElementById("gen").onclick = async () => {
        if (!generated || confirm("Are you sure you want to reset the current code?")) {
            generated = true;

            const f = choice(
                Array.from(document.querySelectorAll(".sel"))
                .filter(e => e.checked)
                .map(e => funcMap[e.id])
            );

            if (!f) {
                return;
            }

            puzzle.plaintext = choice(paragraphs);
            f(puzzle);

            plaintextElem.style.display = "none";
            keyElem.style.display = "none";

            nameElem.innerText = nameMap[f.name];
            plaintextElem.innerText = puzzle.plaintext;
            ciphertextElem.innerText = puzzle.ciphertext;
            keyElem.innerText = puzzle.key;
        }
    };

    function atbash(puzzle) {
        affine(puzzle, { a:  25, b: 25 });

        puzzle.key = "";
    }

    function caesar(puzzle, shift) {
        shift = shift || randInt(1, 26);

        monoalphabetic(puzzle, makeKey(alphabet.slice(shift) + alphabet.slice(0, shift)));

        puzzle.key = shift.toString();
    }

    function monoalphabetic(puzzle, key) {
        key = key || makeKey(
            Array.from(alphabet)
            .map(c => ({ c, s: Math.random() }))
            .sort((a, b) => a.s - b.s)
            .map(c => c.c)
            .join("")
        );
        let ciphertext = "";

        Array.from(puzzle.plaintext).forEach((c, i) => ciphertext += key[c] || c);

        puzzle.key = Object.values(key).join("");
        puzzle.ciphertext = ciphertext;
    }

    function monoalphabeticNoSpaces(puzzle, key) {
        key = key || makeKey(
            Array.from(alphabet)
            .map(c => ({ c, s: Math.random() }))
            .sort((a, b) => a.s - b.s)
            .map(c => c.c)
            .join("")
        );
        monoalphabetic(puzzle, key);

        puzzle.ciphertext = puzzle.ciphertext.replace(/[^[A-Z]]/g, "");
    }

    function affine(puzzle, key) {
        key = key || { a: randInt(1, 27), b: randInt(0, 26) };

        const { a, b } = key;

        let ciphertext = "";

        Array.from(puzzle.plaintext).forEach((c, i) => {
            const x = alphabet.indexOf(c);

            ciphertext += x < 0 ? c : alphabet[(a * x + b) % 26];
        });

        puzzle.key = `${a}x + ${b}`;
        puzzle.ciphertext = ciphertext;
    }

    function vigenere(puzzle, key) {
        key = key || choice(phrases);

        let ciphertext = "";
        let i = 0;

        Array.from(puzzle.plaintext).forEach(c => {
            const x = alphabet.indexOf(c);
            const y = alphabet.indexOf(key[i % key.length]);

            ciphertext += x < 0 ? c : (++i, alphabet[(x + y) % 26]);
        });

        puzzle.key = key;
        puzzle.ciphertext = ciphertext;
    }

    function baconian(puzzle) {
        let ciphertext = "";

        Array.from(puzzle.plaintext).forEach(c => {
            var x = alphabet.indexOf(c);

            if (x > 8) --x;
            if (x > 19) --x;

            ciphertext += x < 0 ? c : x.toString(2)
                .padStart(5, "0")
                .replace(/0/g, "a")
                .replace(/1/g, "b");
        });

        puzzle.key = "";
        puzzle.ciphertext = ciphertext;
    }

    function hill(puzzle, key) {
        if (!key) {
            if (Math.random() < 0.5) {
                key = makeMat(choice(fourLetterWords));
            }
            else {
                key = makeMat(Array(3).fill().map(() => choice(threeLetterWords)).join(" "));
            }
        }

        let ciphertext = "";
        const arr = Array.from(puzzle.plaintext.replace(/[^A-Z]/g, ""));

        for (let i = 0; i < arr.length; i += key.length) {
            let chunk = arr.slice(i, i + key.length);

            chunk.push(...Array(key.length - chunk.length).fill("Z"));

            chunk = chunk.map(c => alphabet.indexOf(c));

            for (const r of key) {
                const c = chunk;

                ciphertext += alphabet[r.map((e, i) => e * c[i]).reduce((a, b) => a + b) % 26];
            }
        }

        puzzle.key = key.map(r => r.map(c => alphabet[c]).join(" ")).join("\n");
        puzzle.ciphertext = ciphertext;
    }
})();
