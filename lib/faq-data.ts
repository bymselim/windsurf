export interface FAQItem {
  slug: string;
  question: string;
  answer: string;
  /** When set, after typing the answer, shows Matrix-style effect with this text, then fades to black. */
  matrixEnding?: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    slug: "1",
    question: "Eserler neyden üretilmektedir?",
    answer: `Malzeme, Süreç ve Etki Üzerine
Çalışmalarımı, tek bir malzemeye ya da tekil bir üretim tekniğine indirgenemeyecek, zaman içinde geliştirdiğim çok katmanlı bir kompozit yapı sistemiyle üretiyorum. Bu yapı, yalnızca fiziksel bir taşıyıcı sistem değil; formun, ışığın ve mekânla kurulan ilişkinin birlikte düşünülmesiyle ortaya çıkan bütünsel bir üretim yaklaşımının sonucudur. Her eser, en iç katmandan en dış yüzeye kadar bilinçli kararlarla inşa edilir ve bu kararlar estetik olduğu kadar yapısal bir mantığa da dayanır.
İç yapıda kullandığım malzemeler, hafiflik ve dayanıklılığı aynı anda sağlayan, endüstrinin en yüksek kalite standartlarına sahip profesyonel ürünlerden oluşur. Bu seçimler, eserin yalnızca ayakta durmasını değil; uzun vadede formunu, dengesini ve mekân içindeki varlığını korumasını amaçlar. Dayanıklılık benim için görünmeyen ama vazgeçilmez bir değerdir. Çünkü bir eserin zamana karşı direnç göstermesi, estetik değerinin sessiz bir parçasıdır.
Dış yüzeylere gelindiğinde, üretim süreci yalnızca teknik bir uygulama olmaktan çıkar ve algısal bir boyut kazanır. Hakiki gümüş kaplama ve özel olarak geliştirilen yüzey uygulamaları, dekoratif bir tercih olarak değil; formun ışıkla kurduğu ilişkiyi yönlendiren aktif unsurlar olarak kullanılır. Işık, bu eserlerde yüzeyde dolaşan bir yansıma değil; hacmi yeniden tanımlayan, formu çoğaltan ve izleyiciyle kurulan ilişkiyi dönüştüren bir bileşendir. Aynı eser, günün farklı saatlerinde ya da farklı mekânlarda bambaşka bir algı yaratabilir. Bu değişkenlik, üretim sürecinin bilinçli bir parçasıdır.
Endüstrinin en iyi malzemelerini ve en iyi markalarını kullandığımı bilenler, bu işlerin yalnızca malzeme kalitesiyle açıklanamayacağını da bilir. Çünkü bu üretimlerde teknik, el işçiliğiyle tamamlanır. Her eser, milimetrik hassasiyetle, defalarca kontrol edilerek, yüzey geçişleri ve form sürekliliği kusursuz bir noktaya gelene kadar çalışılır. Bu süreç, hız odaklı değil; dikkat, sabır ve tekrar üzerine kurulu bir üretim disiplinidir.
Ancak tüm bu teknik altyapı, eserin merkezine yerleştirilen bir anlatı değildir. Aksine, bilinçli olarak geri planda tutulur. Çünkü eserlerimde malzeme, sonucu tanımlayan bir unsur değildir. Malzeme benim için bir araçtır; düşüncenin, duygunun ve formun taşıyıcısıdır. Bir eseri değerli kılan şey, hangi maddeden üretildiği ya da hangi teknikle tamamlandığı değil; izleyicide bıraktığı etkidir.
Bu noktada benim için belirleyici olan, eserin mekânla kurduğu ilişki, izleyicide uyandırdığı sezgisel tepki ve zaman içinde yarattığı bağdır. Bu işler, açıklanmaktan çok deneyimlenmek üzere üretilir. Teknik detaylara indirgenen bir okuma, bu eserleri eksik bırakır. Çünkü burada amaç, malzemenin kendisini sergilemek değil; malzemenin ötesine geçen bir etki yaratmaktır.
Eserlerimi satın alan koleksiyonerler de bu yaklaşımı paylaşır. Onlar için belirleyici olan, "neyden yapıldı?" sorusu değil; "benimle ne yaptı?" sorusudur. Bu eserlerle yaşayanlar, zaman içinde formla kurdukları ilişkinin değiştiğini, ışıkla birlikte algının dönüştüğünü ve eserin mekânda sessiz ama güçlü bir varlık oluşturduğunu fark eder. Bu farkındalık, teknik bir bilginin çok ötesindedir.
Bu nedenle üretim süreçlerime dair teknik reçeteler, malzeme listeleri ya da uygulama detayları paylaşmayı tercih etmiyorum. Çünkü bu işler bir formül değil; her seferinde yeniden kurulan bir süreçtir. Aynı yaklaşım, her eserde farklı bir sonuca evrilir. Bu da üretimin canlı ve tekrarlanamaz olmasının temel nedenidir.
Sonuç olarak, çalışmalarım malzemeyle başlayan ama malzemede bitmeyen işlerdir. Onları anlamak için sorulması gereken temel soru, "hangi malzemeden yapıldı?" değil; "bende ne bıraktı?"dır. Bu farkı görenlerle kurulan ilişki, zaten ilk bakışta kendini belli eder. Ve bu eserler, tam da bu noktada gerçek karşılığını bulur.`,
  },
  {
    slug: "2",
    question: "Kırılır mı?",
    answer: `Bu soruya cevap vermeden önce, neyin sorulduğunu ayırmak gerekir.
"Kırılır mı?" sorusu, hem duvar tablosu hem de heykel için, tek başına yeterli bir soru değildir.
Çünkü bir duvar tablosu da, bir heykel de, gündelik bir eşya değildir.
Bir ürün gibi test edilmez.
Bir ürün gibi sınıflandırılmaz.
Bir ürün gibi "kırılmazlık" vaadiyle tanımlanmaz.
Bir duvar tablosu, duvara asılı haldeyken hareketsizdir.
Kendi kendine yer değiştirmez.
Kendi kendine düşmez.
Kendi kendine kırılmaz.
Bir heykel de, doğru zemine yerleştirildiğinde ve doğru şekilde konumlandırıldığında sabittir.
Durduğu yerde durur.
Olduğu yerde kalır.
Kendi başına bir risk oluşturmaz.
Buraya kadar gelindiyse, şu netlik kazanır:
Duvar tablosu da, heykel de, kendi varlığıyla tehlikeli değildir.
Ancak burada fizik devreye girer.
Her nesne gibi.
Her form gibi.
Her hacim gibi.
Darbe alan her şey etkilenir.
Düşen her şey iz bırakır.
Çarpan her şey zarar görür.
Bu etki, kullanılan malzemenin adıyla ortadan kalkmaz.
Cam, metal, kompozit, ahşap ya da başka bir yüzey…
Hiçbiri, fizik kurallarının dışında değildir.
Bu noktada açıkça söylenmesi gereken cümle şudur:
Kırılmaz duvar tablosu yoktur.
Kırılmaz heykel yoktur.
Bu cümle sert gelebilir.
Ama doğrudur.
Bir sanat eserinin "kırılmaz" olması, onun sanat eseri olmaktan çıkıp, endüstriyel bir nesne gibi ele alınması anlamına gelir.
Benim çalışmalarım böyle bir iddiayla var olmaz.
Eserlerim, doğru şekilde sergilendiğinde, doğru şekilde taşındığında ve doğru şekilde ele alındığında güvenlidir.
Buradaki "doğru" kelimesi özellikle önemlidir.
Çünkü sanata değer veren herkes, bu kelimenin ne anlama geldiğini zaten bilir.
Müzelerde gördüğünüz eserlerin çoğu kırılgandır.
Bu yüzden korunur.
Bu yüzden dikkatle taşınır.
Bu yüzden belirli mesafelerle sergilenir.
Benim işlerim de aynı bilinçle ele alınır.
Bu nedenle sorulması gereken soru,
"kırılır mı?" değil;
"nasıl sergilenir, nasıl taşınır, nasıl yaşanır?" olmalıdır.
Eğer bu metin uzun geliyorsa,
ya da sabırla okunmuyorsa,
bu da kendi başına bir filtredir.
Çünkü bu duvar tabloları ve heykeller,
hızlı cevaplar için değil;
yavaş bakışlar, bilinçli temas ve dikkatli bir ilişki için üretilir.
Buraya kadar okunduysa, zaten doğru yerdesiniz.
Eğer okunmadıysa, bu da bir cevaptır.`,
  },
  {
    slug: "3",
    question: "Zamanla rengi atar mı?",
    answer: `"Zamanla rengi atar mı?" sorusu üzerine
(duvar tabloları ve heykeller için)
Bu soru genellikle tek bir beklentiye dayanır:
Bir şeyin, zaman karşısında değişmeden kalması.
Ancak burada durup şunu ayırmak gerekir.
Bir sanat eseri ile bir endüstriyel ürün, zamanla aynı ilişkiyi kurmaz.
Bir ürün, zamanla eskir.
Bir sanat eseri ise, zamanla yaşlanır.
Bu iki kavram birbirinden farklıdır.
Renk atması, genellikle yanlış koşullarda kullanılan endüstriyel yüzeyler için kullanılan bir ifadedir.
Oysa bir duvar tablosu ya da bir heykel, gündelik aşınmaya maruz kalacak şekilde tasarlanmaz.
Bu işler sürtülmek için değildir.
Temas edilmek için değildir.
Sürekli müdahale edilmek için değildir.
Eserlerimde kullanılan yüzeyler ve kaplamalar, uzun vadeli sergileme koşulları düşünülerek seçilir ve uygulanır.
Işıkla kurdukları ilişki kontrollüdür.
Yüzeyler, ani renk kayıpları ya da dengesiz solmalar yaratacak şekilde çalışmaz.
Bu, teknik bir tercihtir.
Ama asıl mesele teknik değildir.
Burada asıl soru şudur:
Zamanla neyin değişmesinden bahsediyoruz?
Bir eserin rengi, durduğu mekâna göre algısal olarak değişebilir.
Gün ışığıyla farklı görünür.
Akşam ışığında farklı görünür.
Mekânın rengi, duvarın tonu, ışığın sıcaklığı algıyı dönüştürür.
Bu bir bozulma değildir.
Bu, eserin canlı olmasıdır.
Müzelerde sergilenen eserler de zamanla farklı algılanır.
Bu yüzden ışık düzenleri değişir.
Bu yüzden mesafeler yeniden kurulur.
Ama kimse buna "renk attı" demez.
Eserlerimde kullanılan kaplamalar ve yüzeyler, normal iç mekân koşullarında stabil kalır.
Ancak burada "normal" kelimesi önemlidir.
Doğrudan ve sürekli güneş ışığına maruz bırakmak,
aşırı nem,
kontrolsüz dış mekân koşulları
ya da eserin doğasına aykırı bir kullanım,
her yüzey için olduğu gibi burada da olumsuz etki yaratabilir.
Bu durum yalnızca benim işlerim için geçerli değildir.
Tüm sanat eserleri için geçerlidir.
Bir sanat eserinin zamanla tamamen değişmeden kalması beklenmez.
Beklenmemelidir.
Çünkü sanat, steril bir nesne değil;
zamanla birlikte var olan bir yapıdır.
Bu nedenle "rengi atar mı?" sorusu,
teknik bir güvence arayışından çok,
yanlış bir kategoriye yerleştirme refleksidir.
Sorulması gereken soru şudur:
"Bu eser zamanla benimle nasıl yaşar?"
Bu soruyu soranlar,
ışığın değiştiğini,
mekânın dönüştüğünü,
algının derinleştiğini fark eder.
Bu işleri tercih edenler için,
zaman bir tehdit değil;
eserin bir parçasıdır.
Eğer bu metin uzun geliyorsa,
ya da "kısaca evet mi hayır mı?" cevabı aranıyorsa,
bu da kendi başına bir filtredir.
Çünkü bu duvar tabloları ve heykeller,
zamanı durdurmak için değil;
zamanla birlikte var olmak için üretilir.
Buraya kadar okunduysa,
zaten doğru yerdesiniz.
Okunmadıysa,
bu da bir cevaptır.`,
  },
  {
    slug: "4",
    question: "Evde çocuk var, tehlikeli mi?",
    answer: `"Evde çocuk var, tehlikeli mi?" sorusu üzerine
(duvar tabloları ve heykeller için)
Bu sorunun kendisi, aslında iki farklı meseleyi aynı anda içerir.
Birincisi çocuk güvenliği.
İkincisi ise bir sanat eserinin ev içindeki konumlanışı.
Bu iki konu birbirine karıştırıldığında, yanlış beklentiler ortaya çıkar.
Bir duvar tablosu ya da bir heykel, çocuk oyuncağı değildir.
Bir oyun nesnesi değildir.
Bir temas yüzeyi olarak tasarlanmaz.
Bir çocuğun müdahalesine göre test edilmez.
Bu noktada durup şunu netleştirmek gerekir:
Bir sanat eseri, evdeki diğer objelerle aynı kategoriye ait değildir.
Evde çocuk varsa, tehlikeli olabilecek tek şey sanat eseri değildir.
Köşeli bir masa tehlikelidir.
Cam bir sehpa tehlikelidir.
Devrilebilen bir lambader tehlikelidir.
Ağır bir kitaplık tehlikelidir.
Bunların hiçbiri "kendiliğinden" tehlikeli değildir.
Tehlike, nasıl konumlandırıldıklarıyla ilgilidir.
Duvar tabloları, doğru yükseklikte ve doğru askı sistemleriyle sabitlendiğinde güvenlidir.
Heykeller, doğru zemine yerleştirildiğinde ve devrilmeyecek şekilde konumlandırıldığında güvenlidir.
Ancak bu güvenlik, eserin doğasından değil;
ona gösterilen bilinçten kaynaklanır.
Bir çocuğun erişebileceği yükseklikte duran, çekilebilen, itilebilen ya da devrilebilen her şey risklidir.
Bu yalnızca sanat eserleri için değil, evin içindeki her nesne için geçerlidir.
Burada şu gerçeği açıkça söylemek gerekir:
Bir sanat eseri, çocuk güvenliği kriterlerine göre tasarlanmaz.
Bu, bir eksiklik değildir.
Bu, sanatın doğasıdır.
Müzelerde çocuklar vardır.
Ama eserlerle aralarında mesafe vardır.
Evlerde de bu mesafe, bilinçle kurulur.
Eserlerim, doğru şekilde sergilendiğinde ve doğru şekilde konumlandırıldığında ev ortamında güvenlidir.
Ancak çocukların aktif temasına, çekmesine, tırmanmasına ya da oyun nesnesi gibi kullanılmasına uygun değildir.
Bunun aksi bir beklenti, sanat eserinden değil; yanlış bir varsayımdan kaynaklanır.
Bu nedenle sorulması gereken soru,
"Evde çocuk var, tehlikeli mi?" değil;
"Bu eseri evimde nasıl doğru bir şekilde konumlandırmalıyım?" olmalıdır.
Bu soruyu soranlar için cevap zaten bellidir.
Çünkü sanata değer veren biri,
bir eserin alanını, mesafesini ve sınırını da bilir.
Eğer bu metin uzun geliyorsa,
ya da "daha kısa bir cevap yok mu?" diye düşündürüyorsa,
bu da kendi başına bir filtredir.
Çünkü bu duvar tabloları ve heykeller,
çocuklara göre değil;
bilinçli yetişkinlerle kurulan bir ilişki için üretilir.
Buraya kadar okunduysa, zaten doğru yerdesiniz.
Okunmadıysa, bu da bir cevaptır.`,
  },
  {
    slug: "5",
    question: "Eğitim veriyor musunuz?",
    answer: `"Eğitim veriyor musunuz?" sorusu üzerine
Bu soru bana sıklıkla geliyor.
Çoğu zaman, ortaya çıkan sonucu teknik bir tarifle tekrar edilebilecek bir üretim biçimi sanarak soruluyor.
Öncelikle şunu netleştireyim:
Evet, eğitim veriyorum.
Ancak bu, kısa süreli bir workshop ya da birkaç teknik püf noktası aktarımı değildir.
Bu üretim biçimi; yıllar süren deneyim, ciddi maddi yatırım ve endüstriyel disiplin gerektirir.
Bugüne kadar yalnızca teknik geliştirme, ekipman, tesis altyapısı ve deneme süreçleri için yaklaşık 400.000$'lık bir yatırım yaptım.
Bu yatırımın içinde başarısız denemeler, çöpe giden yüzeyler, sökülen katmanlar ve yeniden yapılan işler vardır.
Yani görünen sonuç, görünmeyen uzun bir sürecin ürünüdür.
Eğitim bedeli 50.000 €'dur.
Ancak bu eğitime başlamadan önce bir ön koşul vardır.
Adayın, en az bir yıl profesyonel bir boya ustasının yanında çalışmış olması gerekir.
Tabancanın atomizasyon mantığını bilmeyen,
astarın yüzey hazırlığındaki rolünü deneyimlememiş,
zımpara disiplinini içselleştirmemiş,
sertleştirici oranlarının kimyasal etkisini anlamamış,
verniğin davranışını uygulamalı olarak görmemiş birinin bu süreci anlaması mümkün değildir.
Bu bir eleme değil, bir gerçekliktir.
Bu üretim sistemini kurmak isteyen biri için yalnızca eğitim yeterli değildir.
Minimum 60.000–70.000 € arası makine ve ekipman yatırımı gerekir.
Buna uygun alan, kompresyon dengesi, hava kontrolü, yüzey hazırlık ekipmanları ve sarf malzemeleri dahil değildir.
Kendi başına denemeye çalışanlar oldu mu?
Evet.
Ekipman alanlar, benzer yüzeyler denemeye çalışanlar, teknik olarak yaklaşmaya çalışanlar oldu.
Ancak şunu fark ettiler:
Bu iş, yalnızca makine ve malzemeyle kurulmaz.
Çünkü burada belirleyici olan;
katman geçişlerini okuma yeteneği,
yüzeyin "olduğu anı" sezebilme refleksi,
nerede duracağını bilme disiplini
ve estetik karar verme hızıdır.
Teknik bilgi aktarılabilir.
Makine satın alınabilir.
Ancak sezgi, tekrar ve yüzlerce hatalı denemeyle gelişir.
Bu nedenle birkaç ay içinde bırakmak zorunda kalanlar oldu.
Çünkü üretimin görünmeyen kısmı, göründüğünden daha ağırdır.
Bu sürecin kapısı herkese açıktır.
Ancak eşik yüksektir.
Bu alan, "deneyeyim" merakıyla değil,
uzun vadeli disiplin ve ciddi yatırım iradesiyle girilecek bir alandır.
Benim üretim pratiğim;
hızla çoğaltılabilir bir sistem değil,
kişisel olarak inşa edilmiş bir metodolojidir.
Eğitim almak isteyen biri,
öncelikle bu sürecin ağırlığını ve maliyetini kabullenmelidir.
Eğer soru "Nasıl yapıyorsunuz?" merakından geliyorsa,
cevap: uzun yıllar ve yüksek yatırım.
Eğer soru "Ben de yapabilir miyim?" ise,
cevap: doğru altyapı, doğru disiplin ve ciddi bir bütçe ile — evet, mümkündür.
Ancak bu yol kısa değildir.
Ucuz değildir.
Ve hafif değildir.
Bu alan, hızlı sonuç isteyenler için değil;
süreçle yaşamayı kabul edenler içindir.`,
  },
  {
    slug: "6",
    question: "Bu eserler Nasıl ve neden bu kadar pahalı?",
    answer: `Sık Sorulan Sorular Hakkında Küçük Bir Açıklama
Eserlerim hakkında en sık gelen sorular genellikle aynı başlıklarda toplanıyor:
"Bu eser neden bu fiyat?",
"Neyden yapıldı?",
"Bu kadar pahalı olmasının sebebi nedir?"
"Nasıl bu kadar pahalı olabilir?"
"Bu paraya satamazsınız!!!"
"Bu kadar etmez!!!"

Bu ve benzeri soruların, bu soruların üzerinden sonrasında edilene tüm hakaretlerin cevapları bu cevap sayfasında...

Eğer bu metni sonuna kadar sabırla okursanız, bugün sizde bir farkındalığın uyanmasını sağlayabilecek bir soru ile tüm cevaplarınızı bulabilirsiniz. Belki de bugün sizin aydınlanma gününüz bile olabilir.

Bu soruların çoğu iyi niyetli meraktan geliyor olabilir. Ya da belki düşün dünyanızın kabul edemediği bir alandasınız. Ancak bazen bu soruların arkasında sanat eserlerini endüstriyel bir ürün gibi değerlendirme alışkanlığı da bulunabiliyor. Bu nedenle burada kısa ama önemli bir açıklama yapmak istiyorum. Aslında kısa demek doğru olmayabilir… çünkü konu biraz daha derin… ve devamı da var.
Sanat eserlerinin fiyatı, market rafındaki bir ürün gibi yalnızca malzeme maliyetiyle belirlenmez. Sanat eserlerinin değeri; sanatçının vizyonu, üretim süreci, kullanılan teknikler, üretim adedi, sanatçının kariyeri, eserlerin bulunduğu koleksiyonlar ve en önemlisi arz ve talep dengesi ile belirlenir.
Ekonomi biliminin en temel kurallarından biri şudur:
Bir şey sınırlıysa ve ona talep varsa, değeri artar.
Limitli üretim sanat eserleri tam olarak bu prensiple çalışır. Üretilen eser sayısı sınırlıdır ve bu eserleri koleksiyonlarına dahil etmek isteyen insanlar vardır. Dolayısıyla fiyatı belirleyen temel unsur, yalnızca üretim süreci değil, aynı zamanda bu talebin kendisidir.
Ama burada bitmiyor… çünkü konunun psikolojik ve sosyolojik bir tarafı da var.
İnsan davranışlarını açıklayan en temel modellerden biri Maslow'un İhtiyaçlar Hiyerarşisi olarak bilinen piramittir. Bu modele göre insanlar önce temel ihtiyaçlarını karşılar: barınma, güvenlik, geçim, stabil bir yaşam. Bu ihtiyaçlar karşılandıktan sonra insanlar hayatlarında farklı alanlara yönelmeye başlarlar: estetik, sanat, koleksiyon, kültür ve kendini ifade etme gibi.
Sanat koleksiyonerliği de tam olarak bu seviyede ortaya çıkar. İnsanlar yalnızca bir nesne satın almak için değil, beğendikleri bir sanat eserini hayatlarına dahil etmek için sanat eseri satın alırlar.
Bu yüzden eserlerimi satın alan kişiler çoğu zaman fiyat üzerinden değil, eserle kurdukları bağ üzerinden karar verirler. Hatta birçok koleksiyoner için eseri satın almak, yalnızca bir alışveriş değil; sanatçının üretim dünyasının bir parçası olma hissidir.
Bu noktada ilginç bir detay daha var… ve evet, burada da bitmiyor.
Çünkü eserlerimin çoğu limitli üretim olduğu için üretim süreci belirli bir sıraya göre ilerler. Bu nedenle birçok koleksiyoner, eseri satın almak için belirli bir süre beklemeyi doğal ve hatta keyifli bir süreç olarak görür. Bazı eserler için yaklaşık bir ay üretim sırası oluşması bu yüzden şaşırtıcı değildir.
Sanat eserleri bazen hızlı tüketilen objeler değildir. Tam tersine, çoğu zaman beklenen, arzulanan ve koleksiyonlara dahil edilen eserlerdir.
Ama burada bir başka önemli konu daha var.
Sanat eserleri yalnızca satın alınan nesneler değildir. Aynı zamanda fikrî ve sanatsal değere sahip kültürel üretimlerdir. Bu nedenle sanat eserlerinin kullanımı, sergilenmesi ve çoğaltılması gibi konular da belirli hukuki ve etik çerçevelere sahiptir.
Bir sanat eserinin amacı dışında kullanılması, izinsiz çoğaltılması veya yanlış şekilde temsil edilmesi durumlarında sanat eserleri ile ilgili yasalar kapsamında çeşitli haklar devreye girebilir. Bu haklar; eserin kullanımının durdurulması, sergilenmesinin engellenmesi veya toplatılması gibi uygulamaları içerebilir.
Bu noktaya kadar okuyanlar muhtemelen şunu fark etmiş olabilir… ama yine de söylemekte fayda var.
Sanat eserleri herkes için üretilmez.
Sanat eserleri, onları gerçekten isteyen, anlayan ve hayatına dahil etmek isteyen kişiler için üretilir.
Bu nedenle bir sanat eserinin fiyatını tartışmaktan önce belki de sorulması gereken daha ilginç bir soru vardır:
"Bu eseri gerçekten istiyor muyum?"
Ve eğer cevap evetse, ikinci soru genellikle şöyle olur:
"Bu eseri hayatıma dahil etmek için ne yapabilirim?"
Ama eğer cevap hayırsa… veya bu soru hiç sorulmuyorsa… o zaman sanat eseri zaten olması gereken yerde kalır:
İzlenen, beğenilen ve saygı duyulan bir yerde.
Ve aslında mesele tam olarak budur.
Sanat eserleri herkes tarafından satın alınmak zorunda değildir.
Ama herkes tarafından görülebilir.
Ve bazen bu bile başlı başına yeterlidir.

Bu noktada küçük ama net bir hatırlatma yapmak gerekir. Profilimde gördüğünüz eserlerin büyük çoğunluğu, burada gördüğünüz bedellerle yeni koleksiyonerlerine satılmış eserlerdir. Yani tartışılan fiyatlar teorik ya da varsayımsal rakamlar değil, koleksiyonerlerin eserleri koleksiyonlarına dahil ederken ödedikleri gerçek bedellerdir.
Bu nedenle sorgulanması gereken şey; bir sanat eserinin değerinin neden bu şekilde belirlendiği değil, bu değeri gören ve severek satın alan koleksiyonerlerin varlığıdır. Sanat eserlerinin değeri çoğu zaman malzeme üzerinden değil, beğeni, vizyon ve koleksiyon kültürü üzerinden oluşur.
Eserlerimi satın alan kişiler çoğu zaman yalnızca bir obje satın aldıklarını düşünmezler. Onlar için bu eserler; estetik bir tercih, bir koleksiyon parçası ve bir sanatçı ile kurulan entelektüel bağın sonucudur. Bu nedenle birçok koleksiyoner bir eseri satın almak için üretim sırasını beklemeyi doğal ve hatta keyifli bir süreç olarak görür.
Dolayısıyla bir eserin fiyatını eleştirmek yerine belki de daha doğru soru şudur:
Bu eseri satın alanlarla benim aramda nasıl bir fark var?
Çünkü sanat eserleri herkes tarafından satın alınmak zorunda değildir.
Ancak eğer bir eser size yüksek geliyorsa ve sizin için ulaşılabilir görünmüyorsa, bu durum çoğu zaman sanatçı ile koleksiyonerler arasında oluşan değer algısı ile bulunduğunuz yaşam standardı, gelir seviyesi ve estetik yaklaşım arasındaki farktan kaynaklanır.

Özetle, bu fiyatlar size yüksek, aşırı, pahalı geliyorsa, bu sizin yaşadığınız hayat ve standartlarınızla ilgilidir. Ürettiğim her eser, benim elimden çıktığı için, sınırlı üretim olduğu için, eserdeki ruhu hisseden ve yüksek gelir grubundan koleksiyonerlere hitap ettiği için satılıyor.

Bu kriterleri karşılamadığınız ve sahip olmadığınız için, size uçuk, yüksek, farklı hissettiriyor olabilir. 

Son olarak, beğenerek fiyat talebinde bulunduğunuz bu eser, bu açıklamadan sonra size değersiz geliyorsa, eserin hedef kitlesi olmadığınızı da teyit etmiş oluyorsunuz. 

Ürettiğim eserler Türkiye'nin ve dünyanın %1 'lik kesimine hitap ediyor, %1'lik kesim satın alıyor, hissediyor, sıra bekliyor, paylaşıyor, sanatın ruhunu mekanlarında görmek istiyor. 

%99 'luk kalan kesim izliyor, eleştiriyor, önce beğenip, sonra hakaretler ediyor. Sizce siz hangi taraftasınız? 

Sorgulamanız gereken eserlerimin fiyatları değil, sizin hayatta hangi tarafta kaldığınızdır. 

Hayat kısa kuşlar uçuyor...`,
  },
  {
    slug: "7",
    question: "Nasıl bu kadar pahalı? (Kısa)",
    answer: `Sanat herkese gösterilir. Ama herkes için üretilmez. Eserlerim dünyanın %1 'lik kesimine hitap ediyor, profilimde gördüğünüz postlar ve videolardaki tüm eserler bu %1'lik kesimin, benim sanatıma saygı duyan ve sanatımı hisseden insanları tarafından satın alındı. Ben sanatımı istediğim kitleye duyurabildiğim için mutluyum, sanatseverlerim eserlerime sahip oldukları için mutlular. Onlar mekanlarını eserlerimle güzelleştirirken, sanatımın ruhunu hissederken, bana ürettiğim bu sanatın ve eseri üretirken harcadığım zamanın bedelini ödedikleri için onlara müteşekkirim. 

%99 'lük kısmı ise izliyor, fiyatı uçuk buluyor, neyden yapıldı diye sorular soruyor, hakaretler ediyor, kendince yaptığım eserlere değer biçiyor, biçtiği değerin ne beni ne de sanatseverlerimi ilgilendirmediğinin farkında olmuyor. 

Ve eğer şuanda bu mesajı okuyorsanız, hangi tarafta olduğunuzun ve hedef kitlem olmadığınızın farkındasınız değil mi? 

O yüzden Sanat herkese gösterilir. Ama herkes için üretilmez. Sadece görüyorsanız, sahip olamıyor ve erişemiyorsanız %99'da, hem görüyor ve hem sizin için üretiliyorsa %1'desiniz... 

Özetle; Profilimde gördüğünüz tüm eserler, bu fiyatlardan satıldı,  satılıyor...

Tavsiyem; aynaya bakıp, ben neden %1'lik kesimde değilim sorusunu cevabını aramanızdır. Benim eserime sahip olmak ya da olmamak mesele değil. Mesele o %1'lik kesim ne yaşıyor ve ne hissediyor ve siz neden bu imkanlara sahip değilsiniz ve böyle hissedemiyorsunuz sorusunun cevabıdır, mesele...`,
    matrixEnding: "Ne diyordu Matrix filminde, Wake Up Neo!",
  },
];

export function getFAQBySlug(slug: string): FAQItem | undefined {
  return FAQ_ITEMS.find((item) => item.slug === slug);
}
