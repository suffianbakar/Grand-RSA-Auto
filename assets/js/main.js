    // for audio background
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let isAudioOn = false;
    const bgMusic = document.getElementById('bg-music');
    bgMusic.volume = 0.3; 

    function playNote(freq, type, duration, vol = 0.1) {
        if (!isAudioOn) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    function soundClick() { 
        playNote(600, 'sine', 0.1); 
    }
    function soundSuccess() { 
        playNote(500, 'square', 0.1); 
        setTimeout(() => playNote(800, 'square', 0.3), 100);
    }
    function soundError() { 
        playNote(150, 'sawtooth', 0.4, 0.2); 
    }

    function toggleAudio() {
        isAudioOn = !isAudioOn;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const icon = document.getElementById('audio-icon');
        icon.className = isAudioOn ? "fas fa-volume-up" : "fas fa-volume-mute";
        
        if (isAudioOn) {
            bgMusic.play().catch(e => console.log("Auto-play blocked by browser. Interaction required."));
        } else {
            bgMusic.pause();
        }
        soundClick();
    }

    // Global Variables
    let p_val, q_val, n_val, phi_val, e_current, d_current, text_orig = "", cipher_data = [], time_left = 60, game_timer, primes_picked = [];
    let current_user_name = "Agent_Guest";
    let agent_leaderboard = JSON.parse(localStorage.getItem('rsa_scores')) || [];

    const animeAvatarSvg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#6366f1" opacity="0.1"/>
            <circle cx="50" cy="45" r="30" fill="#ffdbac"/>
            <path d="M25 35 Q50 5 75 35" fill="#312e81"/>
            <rect x="35" y="45" width="8" height="3" rx="1" fill="#312e81"/>
            <rect x="57" y="45" width="8" height="3" rx="1" fill="#312e81"/>
            <path d="M40 60 Q50 65 60 60" stroke="#312e81" stroke-width="2" fill="none"/>
            <path d="M20 70 Q50 100 80 70 L80 100 L20 100 Z" fill="#4f46e5"/>
        </svg>
    `;

    function isPrimeNum(num) {
        if (num <= 1) return false;
        for(let i=2; i<=Math.sqrt(num); i++) if(num%i===0) return false;
        return true;
    }

    function calculateGcd(a, b) { return b ? calculateGcd(b, a % b) : a; }
    
    function findModInverse(e, phi) {
        let m0 = phi, t, q, x0 = 0, x1 = 1;
        if (phi == 1) return 0;
        while (e > 1) {
            if (phi === 0) return 0; 
            q = Math.floor(e / phi);
            t = phi; phi = e % phi; e = t;
            t = x0; x0 = x1 - q * x0; x1 = t;
        }
        if (x1 < 0) x1 += m0;
        return x1;
    }

    function calculatePowerMod(base, exp, mod) {
        let res = 1n; base = BigInt(base) % BigInt(mod);
        while (exp > 0n) { if (exp % 2n == 1n) res = (res * base) % BigInt(mod); base = (base * base) % BigInt(mod); exp = exp / 2n; }
        return res;
    }

    function showScreen(id) {
        soundClick();
        document.querySelectorAll('.game-card > div:not(.top-nav):not(#game-progress)').forEach(d => d.classList.add('hidden'));
        const screen = document.getElementById(id);
        if(screen) screen.classList.remove('hidden');
        
        if(id === 'game-area') {
            document.getElementById('game-progress').classList.remove('hidden');
        } else {
            document.getElementById('game-progress').classList.add('hidden');
            updateUserDisplay();
        }
    }

    function updateUserDisplay() {
        const displays = document.querySelectorAll('.display-user-name');
        displays.forEach(d => d.innerText = current_user_name);
    }

    function askUserNameAndStart() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if (!isAudioOn) toggleAudio();

        uiAlert("AGENT ENROLLMENT", "Please enter your agent codename:", "info", true, (newName) => {
            if(newName && newName.trim() !== "") {
                current_user_name = newName.trim();
                showScreen('screen-briefing');
            } else {
                current_user_name = "Agent_Anonymous";
                showScreen('screen-briefing');
            }
        });
    }

    function resetToMenu() {
        clearInterval(game_timer);
        showScreen('screen-start');
        document.getElementById('mission-title').innerText = "Agent Standby";
    }

    function uiAlert(title, msg, type = 'info', isInput = false, callback = null) {
        const modal = document.getElementById('custom-modal');
        const icon = document.getElementById('modal-icon');
        const btn = document.getElementById('modal-btn');
        const field = document.getElementById('modal-field');
        
        modal.classList.remove('hidden');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerHTML = msg;
        
        if(type === 'success') { 
            icon.className = "fas fa-check-circle"; icon.style.color = "var(--success)"; 
            soundSuccess();
        }
        else if(type === 'error') { 
            icon.className = "fas fa-exclamation-triangle"; icon.style.color = "var(--danger)"; 
            soundError();
        }
        else { 
            icon.className = "fas fa-info-circle"; icon.style.color = "var(--primary)"; 
            soundClick();
        }

        if(isInput) { 
            document.getElementById('modal-input-area').classList.remove('hidden'); 
            field.value = ""; 
        }
        else document.getElementById('modal-input-area').classList.add('hidden');

        btn.onclick = () => {
            soundClick();
            modal.classList.add('hidden');
            if(callback) callback(field.value);
        };
    }

    function startTimer() {
        time_left = 120;
        document.getElementById('timer-fill').style.width = "100%";
        clearInterval(game_timer);
        game_timer = setInterval(() => {
            time_left--;
            document.getElementById('timer-fill').style.width = (time_left/120)*100 + "%";
            if(time_left <= 0) { 
                clearInterval(game_timer); 
                uiAlert("MISSION FAILED", "Time's up! Connection lost.", "error", false, () => resetToMenu());
            }
        }, 1000);
    }

    function initGame(min, max, level) {
        showScreen('game-area');
        document.getElementById('mission-title').innerText = "MISSION: " + level;
        startTimer();
        stage1(min, max);
    }

    function stage1(min, max) {
        primes_picked = [];
        let primes = [], nonPrimes = [];
        while(primes.length < 2) {
            let r = Math.floor(Math.random() * (max - min) + min);
            if(isPrimeNum(r) && !primes.includes(r)) primes.push(r);
        }
        while(nonPrimes.length < 6) {
            let r = Math.floor(Math.random() * (max - min) + min);
            if(!isPrimeNum(r) && !nonPrimes.includes(r)) nonPrimes.push(r);
        }
        let allNumbers = [...primes, ...nonPrimes].sort(() => Math.random() - 0.5);
        
        let html = `<h3>Step 1: Identify Prime Numbers</h3>
                    <div class="study-box">
                        <div class="anime-avatar"><img src="assets/icon/alep.png" alt="Agent Briefing" style="width:100%; height:100%; object-fit:cover; "></div>
                        <div>Agent <b class="display-user-name">${current_user_name}</b>, pick two prime numbers to establish a secure handshake.</div>
                    </div>
                    <div class="chip-container">`;
        allNumbers.forEach(num => html += `<div class="chip" onclick="handlePrimeChoice(this, ${num})">${num}</div>`);
        html += `</div><div id="p-status" style="font-weight:700; color:var(--primary); text-align:center">Waiting for selection...</div>`;
        
        document.getElementById('stage-content').innerHTML = html;
        ['s1','s2','s3','s4'].forEach(s => document.getElementById(s).className = "step");
        document.getElementById('s1').className = "step active";
    }

    function handlePrimeChoice(el, num) {
        if(el.classList.contains('selected') || el.classList.contains('wrong')) return;
        if(isPrimeNum(num)) {
            soundSuccess();
            primes_picked.push(num); 
            el.classList.add('selected');
            document.getElementById('p-status').innerText = `Prime identified! (${primes_picked.length}/2)`;
            if(primes_picked.length === 2) {
                document.getElementById('stage-content').innerHTML += `<button class="btn fade-in" onclick="stage2()">PROCEED TO KEYS</button>`;
            }
        } else {
            soundError();
            el.classList.add('wrong');
            setTimeout(() => el.classList.remove('wrong'), 500);
            time_left -= 10;
            document.getElementById('p-status').innerText = `${num} is not prime! -10s penalty.`;
        }
    }

    function stage2() {
        soundClick();
        document.getElementById('s1').className = "step done";
        document.getElementById('s2').className = "step active";
        p_val = primes_picked[0]; q_val = primes_picked[1];
        n_val = p_val * q_val; phi_val = (p_val - 1) * (q_val - 1);
        
        let eOptions = [];
        for(let i=3; eOptions.length < 3; i++) { if(calculateGcd(i, phi_val) === 1) eOptions.push(i); }
        
        let html = `<h3>Step 2: Key Calculations</h3>
                    <div class="study-box">
                        <div class="anime-avatar">
                            <img src="assets/icon/imann.png" alt="Agent Briefing" style="width:100%; height:100%; object-fit:cover; ">
                        </div>
                        <div><b>Modulus (n)</b> = p × q = <b>${n_val}</b><br>
                        <b>Phi φ(n)</b> = (p-1)(q-1) = <b>${phi_val}</b></div>
                    </div>
                    <p>Choose your Public Exponent (e):</p>
                    <div class="chip-container">`;
        eOptions.forEach(v => html += `<div class="chip" onclick="handleEChoice(this, ${v})">${v}</div>`);
        html += `</div><div id="e-status"></div>`;
        document.getElementById('stage-content').innerHTML = html;
    }

    function handleEChoice(el, v) {
        soundClick();
        e_current = v; d_current = findModInverse(e_current, phi_val);
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('e-status').innerHTML = `
            <div class="study-box" style="border-color:var(--success); background: #f0fdf4;">
                <div class="anime-avatar">
                    <img src="assets/icon/Suffian.png" alt="Agent Briefing" style="width:100%; height:100%; object-fit:cover; ">
                </div>
                <div><i class="fas fa-key" style="color:var(--success)"></i> Agent, your <b>Private Key (d)</b> is: <span class="math-tag">${d_current}</span><br>
                <small>Memorize this value. You will need it to unlock the final transmission.</small></div>
            </div>
            <button class="btn" onclick="stage3()">LOCK MESSAGE</button>`;
    }

    function stage3() {
        soundClick();
        document.getElementById('s2').className = "step done";
        document.getElementById('s3').className = "step active";
        document.getElementById('stage-content').innerHTML = `
            <h3>Step 3: Encryption Phase</h3>
            <div class="study-box">
                <div class="anime-avatar">
                    <img src="assets/icon/alep.png" alt="Agent Briefing" style="width:100%; height:100%; object-fit:cover; ">
                </div>
                <div>Enter the secret phrase you wish to transmit (max 10 chars). We will use your Public Key (n=${n_val}, e=${e_current}).</div>
            </div>
            <input type="text" id="p-in" placeholder="ENTER SECRET CODE" maxlength="10">
            <button class="btn" onclick="runEncryption()">ENCRYPT NOW</button>
            <div id="c-out"></div>`;
    }

    function runEncryption() {
        soundClick();
        text_orig = document.getElementById('p-in').value.toUpperCase().trim(); 
        if(!text_orig) return;
        cipher_data = text_orig.split('').map(c => Number(calculatePowerMod(BigInt(c.charCodeAt(0)), BigInt(e_current), BigInt(n_val))));
        document.getElementById('c-out').innerHTML = `
            <div class="study-box" style="word-break:break-all">
                <b>Encrypted Ciphertext:</b><br>${cipher_data.join(' ')}
            </div>
            <button class="btn" onclick="stage4()">FINAL DECRYPTION</button>`;
    }

    function stage4() {
        soundClick();
        document.getElementById('s3').className = "step done";
        document.getElementById('s4').className = "step active";
        document.getElementById('stage-content').innerHTML = `
            <h3>Step 4: Unlock Transmission</h3>
            <div class="study-box">
                <div class="anime-avatar">
                    <img src="assets/icon/imann.png" alt="Agent Briefing" style="width:100%; height:100%; object-fit:cover; ">
                </div>
                <div>Input your <b>Private Key (d)</b> to reveal the original message:</div>
            </div>
            <input type="number" id="d-final" placeholder="Enter value of d">
            <button class="btn" style="background:var(--success)" onclick="runDecryption()">DECRYPT MESSAGE</button>
            <div id="decrypted-result"></div>`;
    }

    function runDecryption() {
        const userD = parseInt(document.getElementById('d-final').value);
        if(userD === d_current) {
            soundSuccess();
            clearInterval(game_timer);
            const score = Math.max(0, time_left * 25);
            let decryptedMessage = cipher_data.map(c => String.fromCharCode(Number(calculatePowerMod(BigInt(c), BigInt(d_current), BigInt(n_val))))).join('');
            
            document.getElementById('decrypted-result').innerHTML = `
                <div class="study-box" style="border-color:var(--success); background:#f0fdf4; text-align:center; display:block;">
                    <b style="color:var(--success)">SECURITY CLEARED</b><br>
                    <span style="font-size:1.5rem; letter-spacing:4px; font-weight:800; color:var(--bg)">${decryptedMessage}</span>
                </div>`;

            setTimeout(() => {
                uiAlert("MISSION SUCCESS", `Agent <b class="display-user-name">${current_user_name}</b>, communication restored. Score: ${score}`, "success", false, () => {
                    agent_leaderboard.push({name: current_user_name, score: score});
                    agent_leaderboard.sort((a,b) => b.score - a.score);
                    localStorage.setItem('rsa_scores', JSON.stringify(agent_leaderboard));
                    resetToMenu();
                });
            }, 1500);
        } else {
            soundError();
            uiAlert("DECRYPTION FAILED", "Incorrect Private Key. Data remains scrambled. -15s penalty.", "error");
            time_left -= 15;
        }
    }

    function showLeaderboard() {
        soundClick();
        let html = `<table class="leaderboard-table">`;
        if(agent_leaderboard.length === 0) {
            html += `<tr><td style="text-align:center">No agent records found.</td></tr>`;
        } else {
            agent_leaderboard.slice(0, 5).forEach((entry, i) => {
                html += `<tr>
                    <td><b>${i+1}.</b> ${entry.name}</td>
                    <td style="text-align:right; color:var(--primary); font-weight:700;">${entry.score} pts</td>
                </tr>`;
            });
        }
        html += `</table>`;
        uiAlert("Hall of Fame", html);
    }

    window.onload = updateUserDisplay;