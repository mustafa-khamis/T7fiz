/**
 * DRAFT legal texts, written from how the platform actually works today, for
 * the owner to replace with reviewed texts. Each document exists in Arabic and
 * English with the same structure. `updated` is the draft date (ISO).
 *
 * Section shape: { id, title, paragraphs: [string], list?: [string] }
 */
export const LEGAL = {
  privacy: {
    updated: '2026-11-18',
    ar: {
      title: 'سياسة الخصوصية',
      intro:
        'توضّح هذه السياسة ما نجمعه من بيانات عند استخدامك منصة تحفيظ، ولماذا نجمعه، وكيف نحميه، وما حقوقك تجاهه. نجمع أقل قدر ممكن من البيانات لتقديم الحلقات وحماية المستخدمين.',
      sections: [
        {
          id: 'collect',
          title: 'البيانات التي نجمعها',
          paragraphs: ['نجمع البيانات التالية فقط:'],
          list: [
            'بيانات الحساب: الاسم، والبريد الإلكتروني، وكلمة المرور مخزّنة بصيغة مشفّرة لا يمكن استرجاعها، أو معرّف حساب Google إن سجّلت به.',
            'الجنس: نطلبه لأن الحلقات مفصولة بين الرجال والنساء، ولا يُستخدم لأي غرض آخر.',
            'تفضيلاتك: اللغة، والمنطقة الزمنية، وشكل الأرقام.',
            'الصورة الشخصية إن أضفتها، بعد إزالة بيانات الموقع وغيرها من الصورة.',
            'بيانات المشاركة في الحلقات: العضويات، والحضور، وسجلات التسميع والمراجعة وملاحظات الشيخ.',
            'طلبات اعتماد المشايخ: البيانات والمستندات والتسجيل الصوتي الذي يقدّمه المتقدّم، وتُحفظ بشكل خاص لا يطّلع عليه إلا المراجعون.',
            'بيانات تقنية لحماية الحساب: أوقات تسجيل الدخول، وعنوان IP، ونوع المتصفح أو الجهاز.',
          ],
        },
        {
          id: 'voice',
          title: 'الجلسات الصوتية',
          paragraphs: [
            'لا نسجّل الجلسات الصوتية. يمرّ الصوت عبر خوادم الاتصال لحظيًا فقط لإيصاله إلى المشاركين، ولا يُحفظ. قد نحفظ بيانات وصفية مثل وقت الانضمام والمغادرة لاحتساب الحضور.',
          ],
        },
        {
          id: 'use',
          title: 'كيف نستخدم بياناتك',
          paragraphs: ['نستخدم البيانات لتشغيل الحساب والحلقات، ولإرسال رسائل البريد الضرورية (تأكيد البريد، واستعادة كلمة المرور، والدعوات)، ولحماية المنصة من إساءة الاستخدام، ولتطوير الخدمة. لا نبيع بياناتك، ولا نستخدمها للإعلانات.'],
        },
        {
          id: 'sharing',
          title: 'مع من نشاركها',
          paragraphs: [
            'يرى شيخ الحلقة وزملاؤك فيها اسمك وصورتك ضمن الحلقة فقط. ونستعين بمزوّدي خدمات يعالجون البيانات نيابةً عنا وفق التزامات تعاقدية: استضافة قاعدة البيانات والملفات (Supabase، داخل الاتحاد الأوروبي)، وإرسال البريد (Resend)، وتسجيل الدخول باستخدام Google إن اخترته، وخدمة الاتصال الصوتي عند تفعيلها.',
          ],
        },
        {
          id: 'retention',
          title: 'مدة الاحتفاظ',
          paragraphs: ['نحتفظ ببيانات الحساب ما دام حسابك قائمًا. تُحذف الملفات المرفوعة غير المستخدمة تلقائيًا خلال أيام، وتُحفظ سجلات الأمان والتدقيق المدة اللازمة لحماية المنصة والوفاء بالالتزامات القانونية.'],
        },
        {
          id: 'security',
          title: 'حماية البيانات',
          paragraphs: ['نشفّر الاتصال بالمنصة وقاعدة البيانات، ونخزّن كلمات المرور بخوارزمية Argon2id، ونقيّد الوصول إلى البيانات على مستوى قاعدة البيانات بحسب صلاحية كل مستخدم، ونسجّل الإجراءات الإدارية الحساسة.'],
        },
        {
          id: 'rights',
          title: 'حقوقك',
          paragraphs: ['يحق لك الاطلاع على بياناتك وتصحيحها وطلب حذف حسابك، والاعتراض على بعض أوجه المعالجة. تعديل الجنس يتم عبر إدارة المنصة فقط حفاظًا على فصل الحلقات.'],
        },
        {
          id: 'children',
          title: 'الأطفال',
          paragraphs: ['قد تتضمن الحلقات طلابًا صغار السن. نعمل على سياسة خاصة بالقُصّر وإشراك أولياء الأمور، وستُضاف إلى هذه الوثيقة قبل تفعيلها.'],
        },
        {
          id: 'cookies',
          title: 'ملفات تعريف الارتباط والتخزين',
          paragraphs: ['نستخدم ملف تعريف ارتباط واحدًا ضروريًا لإبقائك مسجّل الدخول بأمان، ونحفظ اختياراتك للغة والمظهر على جهازك. لا نستخدم ملفات تتبّع إعلانية.'],
        },
        {
          id: 'contact',
          title: 'التواصل والتعديلات',
          paragraphs: ['لأي سؤال عن خصوصيتك تواصل مع إدارة المنصة. وسنُعلمك بأي تعديل جوهري على هذه السياسة قبل سريانه.'],
        },
      ],
    },
    en: {
      title: 'Privacy policy',
      intro:
        'This policy explains what data T7fiz collects when you use the platform, why, how it is protected, and your rights over it. We collect as little as possible to run circles and keep people safe.',
      sections: [
        {
          id: 'collect',
          title: 'What we collect',
          paragraphs: ['We collect only the following:'],
          list: [
            'Account data: your name, email address, and password stored as a one-way hash, or your Google account identifier if you sign in with Google.',
            'Gender: required because circles are separated for men and women. It is used for nothing else.',
            'Your preferences: language, time zone, and digit style.',
            'Your profile picture, if you add one, with location and other metadata removed.',
            'Circle participation: memberships, attendance, recitation and revision records, and your Sheikh’s notes.',
            'Sheikh applications: the details, documents and recitation sample an applicant submits, stored privately and visible only to reviewers.',
            'Technical data that protects your account: sign-in times, IP address, and browser or device type.',
          ],
        },
        {
          id: 'voice',
          title: 'Voice sessions',
          paragraphs: [
            'We do not record voice sessions. Audio passes through the voice servers in real time only to reach the other participants and is not stored. We may keep metadata such as join and leave times to calculate attendance.',
          ],
        },
        {
          id: 'use',
          title: 'How we use your data',
          paragraphs: ['To run your account and circles, to send necessary emails (email confirmation, password recovery, invitations), to protect the platform from abuse, and to improve the service. We do not sell your data or use it for advertising.'],
        },
        {
          id: 'sharing',
          title: 'Who we share it with',
          paragraphs: [
            'Your Sheikh and fellow members see your name and picture within the circle only. Service providers process data on our behalf under contract: database and file hosting (Supabase, in the European Union), email delivery (Resend), Google sign-in if you choose it, and the voice service once it is enabled.',
          ],
        },
        {
          id: 'retention',
          title: 'How long we keep it',
          paragraphs: ['Account data is kept while your account exists. Unused uploaded files are deleted automatically within days. Security and audit records are kept as long as needed to protect the platform and meet legal obligations.'],
        },
        {
          id: 'security',
          title: 'How we protect it',
          paragraphs: ['Connections to the platform and the database are encrypted, passwords are hashed with Argon2id, the database itself restricts each person to the data they are allowed to see, and sensitive administrative actions are logged.'],
        },
        {
          id: 'rights',
          title: 'Your rights',
          paragraphs: ['You can access and correct your data, ask for your account to be deleted, and object to some processing. Gender can only be corrected by the platform administration, to keep circles separated.'],
        },
        {
          id: 'children',
          title: 'Children',
          paragraphs: ['Circles may include young students. A specific policy for minors and guardian involvement is being prepared and will be added here before it takes effect.'],
        },
        {
          id: 'cookies',
          title: 'Cookies and storage',
          paragraphs: ['We use one essential cookie to keep you signed in securely, and store your language and theme choices on your device. We use no advertising or tracking cookies.'],
        },
        {
          id: 'contact',
          title: 'Contact and changes',
          paragraphs: ['For any privacy question, contact the platform administration. We will tell you about material changes to this policy before they take effect.'],
        },
      ],
    },
  },

  terms: {
    updated: '2026-11-18',
    ar: {
      title: 'شروط الاستخدام',
      intro: 'باستخدامك منصة تحفيظ فإنك توافق على هذه الشروط. صُمّمت لحفظ بيئة تعليمية آمنة ومحترمة لحفظ القرآن الكريم ومراجعته.',
      sections: [
        {
          id: 'accounts',
          title: 'الحساب',
          paragraphs: ['الحساب شخصي لا يجوز مشاركته. عليك تقديم بيانات صحيحة، بما فيها الجنس، والحفاظ على سرية كلمة المرور، وإبلاغنا فورًا بأي استخدام غير مأذون.'],
        },
        {
          id: 'conduct',
          title: 'آداب الحلقة وقواعد السلوك',
          paragraphs: ['نلتزم جميعًا بأدب طالب العلم ومعلّمه. ويُمنع على وجه الخصوص:'],
          list: [
            'الإساءة أو التحرش أو التنمّر بأي صورة.',
            'التحريض أو التكفير أو العنف أو إثارة النزاعات الطائفية.',
            'محاولة الوصول إلى حلقات أو بيانات لا تخصّك، أو تجاوز فصل الحلقات بين الرجال والنساء.',
            'تسجيل الجلسات الصوتية أو نشر محتواها أو بيانات المشاركين دون إذن.',
            'استخدام المنصة لأغراض تجارية أو دعائية غير مأذونة.',
          ],
        },
        {
          id: 'circles',
          title: 'الحلقات والمؤسسات',
          paragraphs: ['يتحمّل منشئو الحلقات والمؤسسات مسؤولية إدارتها وفق سياسات المنصة. تخضع الحلقات المستقلة والمؤسسات لمراجعة إدارة المنصة قبل ظهورها للعموم، ويحق للمنصة تعليق أي حلقة أو مؤسسة تخالف هذه الشروط.'],
        },
        {
          id: 'sheikhs',
          title: 'اعتماد المشايخ',
          paragraphs: ['لا يُعيَّن شيخ لحلقة إلا بعد اعتماده من الجهة المختصة بعد مراجعة بشرية لطلبه. يحق للجهة المعتمِدة تعليق الاعتماد أو إلغاؤه مع بيان السبب، ويحق للشيخ التظلّم مرة واحدة من كل قرار.'],
        },
        {
          id: 'payments',
          title: 'المؤسسات الخاصة والاشتراكات',
          paragraphs: ['المشاركة في الحلقات مجانية للطلاب. تدفع المؤسسات الخاصة اشتراكًا شهريًا تحدّده إدارة المنصة، ويُسجَّل الدفع حاليًا يدويًا بالتواصل مع الإدارة. قد يؤدي انتهاء الاشتراك بعد فترة السماح إلى تعليق المؤسسة.'],
        },
        {
          id: 'suspension',
          title: 'تعليق الحسابات',
          paragraphs: ['يحق للمنصة تعليق أي حساب أو إنهاؤه عند مخالفة هذه الشروط أو لحماية المستخدمين، مع تسجيل السبب وإتاحة التظلّم.'],
        },
        {
          id: 'liability',
          title: 'حدود المسؤولية',
          paragraphs: ['نبذل جهدنا لتكون المنصة متاحة وآمنة، لكنها تُقدَّم كما هي دون ضمان بخلوّها من الانقطاع أو الأخطاء. المحتوى التعليمي داخل الحلقات مسؤولية القائمين عليها.'],
        },
        {
          id: 'changes',
          title: 'التعديلات والتواصل',
          paragraphs: ['قد نعدّل هذه الشروط، وسنُعلمك بالتعديلات الجوهرية قبل سريانها. لأي استفسار تواصل مع إدارة المنصة.'],
        },
      ],
    },
    en: {
      title: 'Terms of use',
      intro: 'By using T7fiz you agree to these terms. They exist to keep a safe, respectful learning environment for memorizing and revising the Quran.',
      sections: [
        {
          id: 'accounts',
          title: 'Your account',
          paragraphs: ['Your account is personal and may not be shared. Provide accurate details, including your gender, keep your password confidential, and tell us immediately about any unauthorized use.'],
        },
        {
          id: 'conduct',
          title: 'Circle etiquette and conduct',
          paragraphs: ['Everyone keeps the manners of student and teacher. In particular, the following are not allowed:'],
          list: [
            'Abuse, harassment or bullying of any kind.',
            'Incitement, takfir, violence, or stirring sectarian hostility.',
            'Trying to access circles or data that are not yours, or to get around the separation of men’s and women’s circles.',
            'Recording voice sessions, or publishing their content or participants’ details without permission.',
            'Unauthorized commercial or promotional use.',
          ],
        },
        {
          id: 'circles',
          title: 'Circles and institutions',
          paragraphs: ['Those who create circles and institutions are responsible for running them within platform policies. Independent circles and institutions are reviewed by the platform before they are publicly listed, and the platform may suspend any that break these terms.'],
        },
        {
          id: 'sheikhs',
          title: 'Sheikh approval',
          paragraphs: ['A Sheikh is appointed to a circle only after the responsible authority approves them following a human review. The approving authority may suspend or revoke an approval with a stated reason; a Sheikh may appeal each decision once.'],
        },
        {
          id: 'payments',
          title: 'Private institutions and subscriptions',
          paragraphs: ['Taking part in circles is free for students. Private institutions pay a monthly subscription set by the platform administration; payments are currently recorded manually by contacting the administration. A subscription that lapses beyond its grace period may lead to the institution being suspended.'],
        },
        {
          id: 'suspension',
          title: 'Suspension',
          paragraphs: ['The platform may suspend or close any account that breaks these terms or to protect others, recording the reason and allowing an appeal.'],
        },
        {
          id: 'liability',
          title: 'Limitation of liability',
          paragraphs: ['We work to keep the platform available and safe, but it is provided as is, without a guarantee that it will be uninterrupted or error-free. Educational content within circles is the responsibility of those who run them.'],
        },
        {
          id: 'changes',
          title: 'Changes and contact',
          paragraphs: ['We may change these terms and will tell you about material changes before they take effect. For any question, contact the platform administration.'],
        },
      ],
    },
  },
};
