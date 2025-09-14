const fs = require('fs');
const path = require('path');

// Since Puppeteer might not be available, let's create a simple text-based approach
// to generate test documents in various formats

const createTextDocument = (title, content, filename) => {
  const textContent = `${title}\n${'='.repeat(title.length)}\n\n${content}`;
  fs.writeFileSync(path.join('test_documents/generated', filename), textContent, 'utf8');
  console.log(`Created: ${filename}`);
};

// Create text versions of the documents
createTextDocument(
  'Individual Forest Rights Certificate - Madhya Pradesh',
  `भारत सरकार / Government of India
वन अधिकार अधिनियम, 2006 / Forest Rights Act, 2006
Individual Forest Rights (IFR) Certificate
व्यक्तिगत वन अधिकार प्रमाण पत्र

VERIFIED - सत्यापित - 15/08/2024

Personal Details / व्यक्तिगत विवरण
Name / नाम: श्री राम सिंह / Ram Singh
Father's Name / पिता का नाम: श्री मोहन सिंह / Mohan Singh
Village / गांव: गढ़वा / Garhwa
District / जिला: गढ़वा / Garhwa
State / राज्य: मध्य प्रदेश / Madhya Pradesh

Land Details / भूमि विवरण
Survey Number / सर्वे संख्या: 150/43
Sub Survey / उप सर्वे: 4
Patta Number / पट्टा संख्या: 150043/4-220
Area / क्षेत्रफल: 2.5 hectare / हेक्टेयर
Coordinates / निर्देशांक: 23°45'12"N, 83°12'45"E

Rights Details / अधिकार विवरण
Claim Number / दावा संख्या: IFR/2024/MP/GAR/001
Application Date / आवेदन दिनांक: 15/03/2024
Verification Date / सत्यापन दिनांक: 15/08/2024
Status / स्थिति: Approved / अनुमोदित

Applicant Signature          Forest Officer Signature
आवेदक हस्ताक्षर               वन अधिकारी हस्ताक्षर
_________________            _________________`,
  'ifr_madhya_pradesh.txt'
);

createTextDocument(
  'Community Forest Resource Rights - Telangana',
  `తెలంగాణ ప్రభుత్వం / Government of Telangana
వన హక్కుల చట్టం, 2006 / Forest Rights Act, 2006
Community Forest Resource Rights (CFR)
సాముదాయిక అటవీ వనరుల హక్కులు

Community Details / సంఘం వివరాలు
Community Name / సంఘం పేరు: జంగుబాయి గ్రామ సంఘం / Jangubai Grama Sangham
Village / గ్రామం: జంగుబాయి / Jangubai
Mandal / మండలం: ఆదిలాబాద్ / Adilabad
District / జిల్లా: ఆదిలాబాద్ / Adilabad
State / రాష్ట్రం: తెలంగాణ / Telangana

Forest Area Details / అటవీ ప్రాంత వివరాలు
Survey Numbers / సర్వే నంబర్లు: 45, 46, 47, 48/1, 48/2
Total Area / మొత్తం వైశాల్యం: 125.75 hectare / హెక్టేర్
Forest Type / అటవీ రకం: Mixed Deciduous / మిశ్రమ ఆకురాల్చు
Coordinates / నిర్దేశాంకాలు: 19°12'30"N, 79°45'15"E

CFR Rights / సిఎఫ్ఆర్ హక్కులు
Claim Number / దావా నంబర్: CFR/2024/TS/ADL/003
Management Rights / నిర్వహణ హక్కులు: Protect, Regenerate, Manage / రక్షించడం, పునరుత్పత్తి, నిర్వహణ
Committee Members / కమిటీ సభ్యులు: 15 members / 15 సభ్యులు
Application Date / దరఖాస్తు తేదీ: 20/01/2024
Status / స్థితి: Under Review / సమీక్షలో

Committee President          Forest Ranger
కమిటీ అధ్యక్షుడు             అటవీ రేంజర్
_________________           _________________`,
  'cfr_telangana.txt'
);

createTextDocument(
  'Forest Rights Patta - Odisha',
  `ଓଡ଼ିଶା ସରକାର / Government of Odisha
ବନ ଅଧିକାର ପଟ୍ଟା / Forest Rights Patta
ବନ ଅଧିକାର ଅଧିନିୟମ, ୨୦୦୬ / Forest Rights Act, 2006

ସରକାରୀ ମୋହର / OFFICIAL SEAL

Patta Holder Details / ପଟ୍ଟାଦାରଙ୍କ ବିବରଣୀ
Name / ନାମ: ଶ୍ରୀମତୀ ସୀତା ଦେବୀ / Smt. Sita Devi
Father/Husband Name / ପିତା/ସ୍ୱାମୀଙ୍କ ନାମ: ଶ୍ରୀ ରାମ ଚନ୍ଦ୍ର ମହାନ୍ତି / Sri Ram Chandra Mahanti
Village / ଗାଁ: କଳାହାଣ୍ଡି / Kalahandi
Block / ବ୍ଲକ: ଭବାନୀପାଟଣା / Bhawanipatna
District / ଜିଲ୍ଲା: କଳାହାଣ୍ଡି / Kalahandi

Land Details / ଜମି ସଂକ୍ରାନ୍ତ ବିବରଣୀ
Survey Number / ସର୍ଭେ ନମ୍ବର: ୨୮୫/୧ / 285/1
Patta Number / ପଟ୍ଟା ନମ୍ବର: KLD/2024/285-1-FRA
Area / କ୍ଷେତ୍ରଫଳ: ୧.୨୫ ଏକର / 1.25 acres
Land Type / ଜମିର ପ୍ରକାର: କୃଷି ଯୋଗ୍ୟ / Agricultural
Coordinates / ନିର୍ଦେଶାଙ୍କ: 20°15'45"N, 83°10'30"E

Rights Details / ଅଧିକାର ବିବରଣୀ
Claim Number / ଦାବି ନମ୍ବର: IFR/2024/OD/KLD/028
Claim Date / ଦାବି ତାରିଖ: ୧୦/୦୨/୨୦୨୪ / 10/02/2024
Verification Date / ସତ୍ୟାପନ ତାରିଖ: ୨୫/୦୭/୨୦୨୪ / 25/07/2024
Approval Date / ମଞ୍ଜୁରୀ ତାରିଖ: ୧୫/୦୮/୨୦୨୪ / 15/08/2024

VERIFIED - ସତ୍ୟାପିତ

Patta Holder Signature      Forest Officer Signature
ପଟ୍ଟାଦାର ସହି              ବନ ଅଧିକାରୀ ସହି
ଶ୍ରୀମତୀ ସୀତା ଦେବୀ         Date: 15/08/2024`,
  'patta_odisha.txt'
);

createTextDocument(
  'Forest Rights Verification Report - Tripura',
  `ত্রিপুরা সরকার / Government of Tripura
বন অধিকার যাচাইকরণ প্রতিবেদন / Forest Rights Verification Report
বন অধিকার আইন, ২০০৬ / Forest Rights Act, 2006

Applicant Information / আবেদনকারীর তথ্য
Name / নাম: শ্রী অরুণ চক্রবর্তী / Sri Arun Chakraborty
Father's Name / পিতার নাম: শ্রী গোপাল চক্রবর্তী / Sri Gopal Chakraborty
Village / গ্রাম: রাইমা / Raima
Thana / থানা: খোয়াই / Khowai
District / জেলা: খোয়াই / Khowai

Claim Details / দাবীর বিবরণ
Claim Number / দাবী নম্বর: IFR/2024/TR/KHW/012
Survey Number / সার্ভে নম্বর: ১৮৫/৩ / 185/3
Area / এলাকা: ০.৭৫ হেক্টর / 0.75 hectare
Coordinates / স্থানাংক: 23°50'20"N, 91°42'15"E

Verification Details / যাচাইকরণের বিবরণ
Verification Item          Status         Comments
Residence Proof           Correct        Name in voter list
Land Possession Proof     Correct        In possession since 1980
Forest Land Verification  Confirmed      Forest land in survey records

Verification Date / যাচাইকরণের তারিখ: ১২/০৭/২০২ৄ / 12/07/2024
Recommendation / সুপারিশ: অনুমোদনের জন্য সুপারিশকৃত / Recommended for Approval

Verification Committee Members / যাচাইকরণ কমিটির সদস্যগণ
Chairperson / সভাপতি: শ্রী রাজেন দাস (ব্লক উন্নয়ন অফিসার) / Sri Rajen Das (BDO)
Member / সদস্য: শ্রীমতী সুমিত্রা দে (গ্রাম প্রধান) / Smt. Sumitra De (Village Head)
Member Secretary / সদস্য সচিব: শ্রী অমিত চক্রবর্তী (ফরেস্ট রেঞ্জার) / Sri Amit Chakraborty (Forest Ranger)

Verification Officer Signature    Divisional Forest Officer Signature
যাচাইকরণ কর্মকর্তার স্বাক্ষর        বিভাগীয় বন কর্মকর্তার স্বাক্ষর
Date: 12/07/2024                 Date: 15/07/2024`,
  'verification_tripura.txt'
);

console.log('All test documents created successfully!');
console.log('Files created in test_documents/generated/');