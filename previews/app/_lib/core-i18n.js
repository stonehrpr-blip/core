/* ================================================================
   CORE i18n — lightweight onboarding translations.
   - Language persists in localStorage('coreLang'); default 'en'.
   - Any element with data-i18n="key" gets its textContent swapped;
     data-i18n-html="key" swaps innerHTML (for titles with <br>/<span>).
   - window.coreI18n = { lang, t(key), set(lang), apply(), LANGS }.
   - RTL (ar) flips document.dir automatically.
   Coverage: launch screen, Corbit intro, live trial steps + CTAs.
   Add keys here and tag elements — no other wiring needed.
   ================================================================ */
(function () {
  var LANGS = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'pt', name: 'Português' },
    { code: 'it', name: 'Italiano' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ar', name: 'العربية', rtl: true },
  ];

  var S = {
    /* ── launch (01-index) ── */
    'index.hero':        { en: 'Become<br/><span class="g">your core.</span>', es: 'Conviértete en<br/><span class="g">tu esencia.</span>', fr: 'Deviens<br/><span class="g">ton essentiel.</span>', de: 'Werde<br/><span class="g">dein Kern.</span>', pt: 'Torna-te<br/><span class="g">o teu núcleo.</span>', it: 'Diventa<br/><span class="g">il tuo nucleo.</span>', zh: '成为<br/><span class="g">核心的你。</span>', ja: '本当の<br/><span class="g">自分になる。</span>', ko: '진짜 나를<br/><span class="g">만나다.</span>', hi: 'बनो<br/><span class="g">अपना मूल।</span>', ar: 'كُن<br/><span class="g">جوهرك.</span>' },
    'index.tap':         { en: 'Tap anywhere to continue', es: 'Toca en cualquier lugar para continuar', fr: 'Touchez pour continuer', de: 'Zum Fortfahren tippen', pt: 'Toca para continuar', it: 'Tocca per continuare', zh: '点按任意位置继续', ja: 'タップして続ける', ko: '아무 곳이나 탭하여 계속', hi: 'जारी रखने के लिए कहीं भी टैप करें', ar: 'انقر في أي مكان للمتابعة' },
    'index.legal':       { en: 'By continuing, you agree to our <a href="82-legal.html#terms">Terms</a> and <a href="82-legal.html#privacy">Privacy Policy</a>.', es: 'Al continuar, aceptas nuestros <a href="82-legal.html#terms">Términos</a> y <a href="82-legal.html#privacy">Privacidad</a>.', fr: 'En continuant, vous acceptez nos <a href="82-legal.html#terms">Conditions</a> et notre <a href="82-legal.html#privacy">Confidentialité</a>.', de: 'Mit dem Fortfahren akzeptierst du unsere <a href="82-legal.html#terms">AGB</a> und <a href="82-legal.html#privacy">Datenschutz</a>.', pt: 'Ao continuar, aceitas os <a href="82-legal.html#terms">Termos</a> e a <a href="82-legal.html#privacy">Privacidade</a>.', it: 'Continuando accetti i <a href="82-legal.html#terms">Termini</a> e la <a href="82-legal.html#privacy">Privacy</a>.', zh: '继续即表示同意我们的<a href="82-legal.html#terms">条款</a>和<a href="82-legal.html#privacy">隐私政策</a>。', ja: '続行すると<a href="82-legal.html#terms">利用規約</a>と<a href="82-legal.html#privacy">プライバシー</a>に同意したことになります。', ko: '계속하면 <a href="82-legal.html#terms">약관</a> 및 <a href="82-legal.html#privacy">개인정보처리방침</a>에 동의합니다.', hi: 'जारी रखकर आप हमारी <a href="82-legal.html#terms">शर्तों</a> और <a href="82-legal.html#privacy">गोपनीयता नीति</a> से सहमत हैं।', ar: 'بالمتابعة، أنت توافق على <a href="82-legal.html#terms">الشروط</a> و<a href="82-legal.html#privacy">الخصوصية</a>.' },

    /* ── Corbit intro (02-corbit) ── */
    'corbit.hi':         { en: "Hi. I'm Corbit.", es: 'Hola. Soy Corbit.', fr: 'Salut. Je suis Corbit.', de: 'Hi. Ich bin Corbit.', pt: 'Olá. Sou o Corbit.', it: 'Ciao. Sono Corbit.', zh: '你好，我是 Corbit。', ja: 'こんにちは。Corbitです。', ko: '안녕하세요, 코빗입니다.', hi: 'नमस्ते। मैं Corbit हूँ।', ar: 'مرحباً. أنا كوربيت.' },
    'corbit.sub':        { en: 'Your coach. Built into CORE.', es: 'Tu coach. Integrado en CORE.', fr: 'Ton coach. Intégré à CORE.', de: 'Dein Coach. Teil von CORE.', pt: 'O teu coach. Dentro do CORE.', it: 'Il tuo coach. Dentro CORE.', zh: '你的教练，内置于 CORE。', ja: 'あなたのコーチ。COREの一部。', ko: '당신의 코치. CORE 안에 있습니다.', hi: 'आपका कोच। CORE में निर्मित।', ar: 'مدرّبك. مدمج في CORE.' },
    'corbit.f1t':        { en: 'Learns you', es: 'Te aprende', fr: "T'apprend", de: 'Lernt dich', pt: 'Aprende-te', it: 'Ti impara', zh: '了解你', ja: 'あなたを学ぶ', ko: '당신을 배웁니다', hi: 'आपको समझता है', ar: 'يتعلّمك' },
    'corbit.f1c':        { en: 'Every answer tunes your plan. Nothing generic.', es: 'Cada respuesta ajusta tu plan. Nada genérico.', fr: 'Chaque réponse affine ton plan. Rien de générique.', de: 'Jede Antwort formt deinen Plan. Nichts von der Stange.', pt: 'Cada resposta afina o teu plano. Nada genérico.', it: 'Ogni risposta calibra il tuo piano. Niente di generico.', zh: '每个回答都在调整你的计划，绝不千篇一律。', ja: '答えるたびにプランが最適化。汎用は一切なし。', ko: '모든 답변이 계획을 조정합니다. 획일적인 건 없습니다.', hi: 'हर जवाब आपकी योजना को बेहतर बनाता है।', ar: 'كل إجابة تضبط خطتك. لا شيء عام.' },
    'corbit.f2t':        { en: 'Guides every step', es: 'Te guía en cada paso', fr: 'Te guide à chaque étape', de: 'Führt jeden Schritt', pt: 'Guia cada passo', it: 'Ti guida a ogni passo', zh: '步步引导', ja: '一歩ずつ導く', ko: '모든 단계를 안내', hi: 'हर कदम पर मार्गदर्शन', ar: 'يرشدك في كل خطوة' },
    'corbit.f2c':        { en: "Stuck on a question? I'll appear with the answer.", es: '¿Atascado en una pregunta? Aparezco con la respuesta.', fr: 'Bloqué sur une question ? J\'apparais avec la réponse.', de: 'Hängst du fest? Ich tauche mit der Antwort auf.', pt: 'Preso numa pergunta? Apareço com a resposta.', it: 'Bloccato su una domanda? Arrivo con la risposta.', zh: '卡住了？我会带着答案出现。', ja: '迷ったら、答えと共に現れます。', ko: '막히면 제가 답과 함께 나타납니다.', hi: 'कहीं अटके? मैं जवाब लेकर आऊँगा।', ar: 'عالق في سؤال؟ سأظهر مع الإجابة.' },
    'corbit.f3t':        { en: 'Knows your voice', es: 'Conoce tu voz', fr: 'Connaît ta voix', de: 'Kennt deine Stimme', pt: 'Conhece a tua voz', it: 'Conosce la tua voce', zh: '识别你的声音', ja: '声を覚える', ko: '목소리를 압니다', hi: 'आपकी आवाज़ पहचानता है', ar: 'يعرف صوتك' },
    'corbit.f3c':        { en: "Say one line and I'll recognise you from then on.", es: 'Di una frase y te reconoceré desde entonces.', fr: 'Dis une phrase et je te reconnaîtrai.', de: 'Sag einen Satz — ab dann erkenne ich dich.', pt: 'Diz uma frase e passo a reconhecer-te.', it: 'Di\' una frase e ti riconoscerò.', zh: '说一句话，从此我就认得你。', ja: '一言話せば、以後あなたが分かります。', ko: '한 문장이면 그 후로 당신을 알아봅니다.', hi: 'एक पंक्ति बोलें, फिर मैं आपको पहचान लूँगा।', ar: 'قل جملة واحدة وسأتعرّف عليك دائماً.' },
    'corbit.dna':        { en: 'Your plan is built from your DNA — the answers you give in the next two minutes.', es: 'Tu plan se construye con tu ADN: las respuestas de los próximos dos minutos.', fr: 'Ton plan est construit à partir de ton ADN — tes réponses des deux prochaines minutes.', de: 'Dein Plan entsteht aus deiner DNA — deinen Antworten der nächsten zwei Minuten.', pt: 'O teu plano nasce do teu ADN — as respostas dos próximos dois minutos.', it: 'Il tuo piano nasce dal tuo DNA — le risposte dei prossimi due minuti.', zh: '你的计划源自你的“DNA”——接下来两分钟你给出的答案。', ja: 'プランはあなたのDNA——これから2分間の答え——から作られます。', ko: '당신의 계획은 당신의 DNA, 즉 앞으로 2분간의 답변으로 만들어집니다.', hi: 'आपकी योजना आपके DNA से बनती है — अगले दो मिनट के आपके जवाब।', ar: 'خطتك مبنية من حمضك النووي — إجاباتك في الدقيقتين القادمتين.' },
    'corbit.permT':      { en: 'A few permissions.', es: 'Algunos permisos.', fr: 'Quelques autorisations.', de: 'Ein paar Berechtigungen.', pt: 'Algumas permissões.', it: 'Qualche permesso.', zh: '需要一些权限。', ja: 'いくつかの許可。', ko: '몇 가지 권한.', hi: 'कुछ अनुमतियाँ।', ar: 'بعض الأذونات.' },
    'corbit.permC':      { en: 'Only what makes me useful. Deny anything — I adapt.', es: 'Solo lo que me hace útil. Niega lo que quieras — me adapto.', fr: "Seulement l'utile. Refuse ce que tu veux — je m'adapte.", de: 'Nur was mich nützlich macht. Lehn ruhig ab — ich passe mich an.', pt: 'Só o que me torna útil. Recusa o que quiseres — eu adapto-me.', it: 'Solo ciò che mi rende utile. Rifiuta pure — mi adatto.', zh: '只请求让我有用的权限。拒绝也没关系——我会适应。', ja: '役立つための最小限だけ。拒否してもOK、適応します。', ko: '유용해지는 데 필요한 것만. 거부해도 적응합니다.', hi: 'सिर्फ़ वही जो मुझे उपयोगी बनाए। मना करें — मैं ढल जाऊँगा।', ar: 'فقط ما يجعلني مفيداً. ارفض ما تشاء — سأتكيف.' },
    'corbit.notif':      { en: 'Notifications', es: 'Notificaciones', fr: 'Notifications', de: 'Mitteilungen', pt: 'Notificações', it: 'Notifiche', zh: '通知', ja: '通知', ko: '알림', hi: 'सूचनाएँ', ar: 'الإشعارات' },
    'corbit.notifC':     { en: 'Nudges on the days you slip', es: 'Avisos los días que fallas', fr: 'Un rappel les jours où tu glisses', de: 'Stupser an schwachen Tagen', pt: 'Toques nos dias em que falhas', it: 'Spinte nei giorni difficili', zh: '在你松懈的日子提醒你', ja: 'くじけそうな日にひと押し', ko: '흔들리는 날의 넛지', hi: 'फिसलने वाले दिनों पर याद दिलाना', ar: 'تنبيهات في أيام التعثر' },
    'corbit.mic':        { en: 'Microphone', es: 'Micrófono', fr: 'Micro', de: 'Mikrofon', pt: 'Microfone', it: 'Microfono', zh: '麦克风', ja: 'マイク', ko: '마이크', hi: 'माइक्रोफ़ोन', ar: 'الميكروفون' },
    'corbit.micC':       { en: 'So I can learn your voice', es: 'Para aprender tu voz', fr: 'Pour apprendre ta voix', de: 'Damit ich deine Stimme lerne', pt: 'Para aprender a tua voz', it: 'Per imparare la tua voce', zh: '让我记住你的声音', ja: '声を覚えるため', ko: '목소리를 배우기 위해', hi: 'आपकी आवाज़ सीखने के लिए', ar: 'لأتعلّم صوتك' },
    'corbit.voice':      { en: "Corbit's voice", es: 'La voz de Corbit', fr: 'La voix de Corbit', de: 'Corbits Stimme', pt: 'A voz do Corbit', it: 'La voce di Corbit', zh: 'Corbit 的声音', ja: 'Corbitの声', ko: '코빗의 목소리', hi: 'Corbit की आवाज़', ar: 'صوت كوربيت' },
    'corbit.voiceC':     { en: 'I speak my tips out loud', es: 'Digo mis consejos en voz alta', fr: 'Je dis mes conseils à voix haute', de: 'Ich spreche meine Tipps laut aus', pt: 'Digo as dicas em voz alta', it: 'Dico i consigli ad alta voce', zh: '我会把提示说出来', ja: 'ヒントを声に出します', ko: '팁을 소리 내어 말합니다', hi: 'मैं सुझाव बोलकर बताता हूँ', ar: 'أنطق نصائحي بصوت عالٍ' },
    'corbit.allow':      { en: 'Allow', es: 'Permitir', fr: 'Autoriser', de: 'Erlauben', pt: 'Permitir', it: 'Consenti', zh: '允许', ja: '許可', ko: '허용', hi: 'अनुमति दें', ar: 'السماح' },
    'corbit.granted':    { en: 'On', es: 'Activo', fr: 'Activé', de: 'An', pt: 'Ativo', it: 'Attivo', zh: '已开启', ja: 'オン', ko: '켜짐', hi: 'चालू', ar: 'مفعّل' },
    'corbit.begin':      { en: "Let's begin", es: 'Empecemos', fr: 'Commençons', de: "Los geht's", pt: 'Vamos começar', it: 'Cominciamo', zh: '开始吧', ja: '始めよう', ko: '시작하기', hi: 'शुरू करें', ar: 'لنبدأ' },
    'corbit.skip':       { en: 'Skip intro', es: 'Saltar intro', fr: "Passer l'intro", de: 'Intro überspringen', pt: 'Saltar intro', it: 'Salta intro', zh: '跳过介绍', ja: 'イントロをスキップ', ko: '소개 건너뛰기', hi: 'परिचय छोड़ें', ar: 'تخطي المقدمة' },
    'corbit.tap':        { en: 'Tap to continue', es: 'Toca para continuar', fr: 'Touchez pour continuer', de: 'Tippen zum Fortfahren', pt: 'Toca para continuar', it: 'Tocca per continuare', zh: '点按继续', ja: 'タップして続ける', ko: '탭하여 계속', hi: 'जारी रखने के लिए टैप करें', ar: 'انقر للمتابعة' },

    /* ── trial (07) — live steps ── */
    'trial.t0':          { en: 'This only<br/><span class="g">works if you mean it.</span>', es: 'Esto solo funciona<br/><span class="g">si lo dices en serio.</span>', fr: 'Ça ne marche que<br/><span class="g">si tu le penses vraiment.</span>', de: 'Das funktioniert nur,<br/><span class="g">wenn du es ernst meinst.</span>', pt: 'Isto só resulta<br/><span class="g">se fores a sério.</span>', it: 'Funziona solo<br/><span class="g">se fai sul serio.</span>', zh: '只有认真<br/><span class="g">才会有效。</span>', ja: '本気でなければ<br/><span class="g">意味がない。</span>', ko: '진심일 때만<br/><span class="g">효과가 있습니다.</span>', hi: 'यह तभी काम करेगा<br/><span class="g">जब आप सच में चाहें।</span>', ar: 'هذا ينجح فقط<br/><span class="g">إن كنت جاداً.</span>' },
    'trial.t1':          { en: 'What should we<br/><span class="g">call you?</span>', es: '¿Cómo te<br/><span class="g">llamamos?</span>', fr: 'Comment doit-on<br/><span class="g">t\'appeler ?</span>', de: 'Wie sollen wir<br/><span class="g">dich nennen?</span>', pt: 'Como te<br/><span class="g">chamamos?</span>', it: 'Come ti<br/><span class="g">chiamiamo?</span>', zh: '我们该怎么<br/><span class="g">称呼你？</span>', ja: 'なんと<br/><span class="g">呼べばいい？</span>', ko: '뭐라고<br/><span class="g">불러드릴까요?</span>', hi: 'हम आपको<br/><span class="g">क्या कहें?</span>', ar: 'بماذا<br/><span class="g">نناديك؟</span>' },
    'trial.t2':          { en: 'Which profile<br/><span class="g">fits you?</span>', es: '¿Qué perfil<br/><span class="g">te define?</span>', fr: 'Quel profil<br/><span class="g">te correspond ?</span>', de: 'Welches Profil<br/><span class="g">passt zu dir?</span>', pt: 'Que perfil<br/><span class="g">é o teu?</span>', it: 'Quale profilo<br/><span class="g">ti rappresenta?</span>', zh: '哪个形象<br/><span class="g">更像你？</span>', ja: 'どちらの<br/><span class="g">プロフィール？</span>', ko: '어떤 프로필이<br/><span class="g">맞나요?</span>', hi: 'कौन-सी प्रोफ़ाइल<br/><span class="g">आप पर सटीक है?</span>', ar: 'أي ملف<br/><span class="g">يناسبك؟</span>' },
    'trial.t4':          { en: 'What are you<br/><span class="g">tackling first?</span>', es: '¿Qué vas a<br/><span class="g">atacar primero?</span>', fr: 'Tu t\'attaques<br/><span class="g">à quoi d\'abord ?</span>', de: 'Was gehst du<br/><span class="g">zuerst an?</span>', pt: 'O que vais<br/><span class="g">atacar primeiro?</span>', it: 'Cosa affronti<br/><span class="g">per primo?</span>', zh: '你要先<br/><span class="g">解决什么？</span>', ja: '最初に<br/><span class="g">何と戦う？</span>', ko: '무엇부터<br/><span class="g">시작할까요?</span>', hi: 'सबसे पहले<br/><span class="g">किससे लड़ेंगे?</span>', ar: 'ما الذي<br/><span class="g">ستواجهه أولاً؟</span>' },
    'trial.t9':          { en: 'When it gets hard,<br/><span class="g">what\'s this really for?</span>', es: 'Cuando se ponga difícil,<br/><span class="g">¿por qué lo haces?</span>', fr: 'Quand ce sera dur,<br/><span class="g">tu le fais pour quoi ?</span>', de: 'Wenn es hart wird —<br/><span class="g">wofür machst du das?</span>', pt: 'Quando apertar,<br/><span class="g">isto é por quê?</span>', it: 'Quando sarà dura,<br/><span class="g">per cosa lo fai?</span>', zh: '当难熬的时候，<br/><span class="g">这一切是为了什么？</span>', ja: '苦しい時、<br/><span class="g">何のためにやる？</span>', ko: '힘들어질 때,<br/><span class="g">진짜 이유는 뭔가요?</span>', hi: 'जब मुश्किल हो,<br/><span class="g">यह असल में किसलिए है?</span>', ar: 'حين تشتد الأمور،<br/><span class="g">لماذا تفعل هذا حقاً؟</span>' },
    'trial.t23':         { en: 'Who do you<br/><span class="g">want to become?</span>', es: '¿Quién quieres<br/><span class="g">llegar a ser?</span>', fr: 'Qui veux-tu<br/><span class="g">devenir ?</span>', de: 'Wer willst du<br/><span class="g">werden?</span>', pt: 'Quem queres<br/><span class="g">tornar-te?</span>', it: 'Chi vuoi<br/><span class="g">diventare?</span>', zh: '你想成为<br/><span class="g">怎样的人？</span>', ja: 'どんな自分に<br/><span class="g">なりたい？</span>', ko: '어떤 사람이<br/><span class="g">되고 싶나요?</span>', hi: 'आप कौन<br/><span class="g">बनना चाहते हैं?</span>', ar: 'من تريد<br/><span class="g">أن تصبح؟</span>' },
    'trial.t24':         { en: 'This is<br/><span class="g">Corbit.</span>', es: 'Este es<br/><span class="g">Corbit.</span>', fr: 'Voici<br/><span class="g">Corbit.</span>', de: 'Das ist<br/><span class="g">Corbit.</span>', pt: 'Este é<br/><span class="g">o Corbit.</span>', it: 'Questo è<br/><span class="g">Corbit.</span>', zh: '这是<br/><span class="g">Corbit。</span>', ja: 'これが<br/><span class="g">Corbit。</span>', ko: '이것이<br/><span class="g">코빗입니다.</span>', hi: 'यह है<br/><span class="g">Corbit।</span>', ar: 'هذا هو<br/><span class="g">كوربيت.</span>' },
    'trial.t22':         { en: 'How committed<br/><span class="g">are you?</span>', es: '¿Cuánto te<br/><span class="g">comprometes?</span>', fr: 'À quel point<br/><span class="g">es-tu engagé ?</span>', de: 'Wie entschlossen<br/><span class="g">bist du?</span>', pt: 'Qual é o teu<br/><span class="g">compromisso?</span>', it: 'Quanto sei<br/><span class="g">determinato?</span>', zh: '你的决心<br/><span class="g">有多大？</span>', ja: 'どこまで<br/><span class="g">本気？</span>', ko: '얼마나<br/><span class="g">진심인가요?</span>', hi: 'आप कितने<br/><span class="g">प्रतिबद्ध हैं?</span>', ar: 'ما مدى<br/><span class="g">التزامك؟</span>' },
    'cta.next':          { en: 'Next', es: 'Siguiente', fr: 'Suivant', de: 'Weiter', pt: 'Seguinte', it: 'Avanti', zh: '下一步', ja: '次へ', ko: '다음', hi: 'आगे', ar: 'التالي' },
    'cta.continue':      { en: 'Continue', es: 'Continuar', fr: 'Continuer', de: 'Fortfahren', pt: 'Continuar', it: 'Continua', zh: '继续', ja: '続ける', ko: '계속', hi: 'जारी रखें', ar: 'متابعة' },
    'cta.sign':          { en: 'Sign', es: 'Firmar', fr: 'Signer', de: 'Unterschreiben', pt: 'Assinar', it: 'Firma', zh: '签署', ja: '署名', ko: '서명', hi: 'हस्ताक्षर', ar: 'وقّع' },
    'cta.skipnow':       { en: 'Skip for now', es: 'Saltar por ahora', fr: 'Passer pour le moment', de: 'Vorerst überspringen', pt: 'Saltar por agora', it: 'Salta per ora', zh: '暂时跳过', ja: '今はスキップ', ko: '지금은 건너뛰기', hi: 'अभी छोड़ें', ar: 'تخطَّ الآن' },
  };

  function getLang() {
    try { return localStorage.getItem('coreLang') || 'en'; } catch (e) { return 'en'; }
  }
  function t(key) {
    var e = S[key];
    if (!e) return null;
    return e[coreI18n.lang] || e.en;
  }
  function apply(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (v != null) el.textContent = v.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-html'));
      if (v != null) el.innerHTML = v;
    });
    var meta = LANGS.filter(function (l) { return l.code === coreI18n.lang; })[0];
    document.documentElement.lang = coreI18n.lang;
    document.documentElement.dir = (meta && meta.rtl) ? 'rtl' : 'ltr';
  }
  function set(lang) {
    coreI18n.lang = lang;
    try { localStorage.setItem('coreLang', lang); } catch (e) {}
    apply();
    try { document.dispatchEvent(new CustomEvent('corelangchange', { detail: { lang: lang } })); } catch (e) {}
  }

  var coreI18n = { lang: getLang(), t: t, set: set, apply: apply, LANGS: LANGS };
  window.coreI18n = coreI18n;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { apply(); });
  else apply();
})();
