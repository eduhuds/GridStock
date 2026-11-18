import Link from 'next/link';
import { Icon } from '@/components/icons';
import { LegalFooterLinks } from '@/components/LegalAccessibilityHub';
import { LandingHeader, OperationFit, ProductPreview, Reveal, Workflow } from './LandingInteractions';
import { WHATSAPP_URL } from './config';
import s from './landing.module.css';

function Brand() {
  return <span className={s.brand}><img src="/gridstock-mark.svg" width="34" height="34" alt="" />GRIDSTOCK<span className={s.brandPeriod}>.</span></span>;
}

function ContactLink({ children = 'Quero uma demonstração', light = false }: { children?: React.ReactNode; light?: boolean }) {
  return <a className={`${s.primaryButton} ${light ? s.lightButton : ''}`} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">{children}<Icon name="arrow" /></a>;
}

function Parcel() {
  return <div className={s.parcelScene} aria-hidden="true">
    <div className={s.parcelShadow} />
    <div className={s.parcel}><div className={s.parcelTop}><i /></div><div className={s.parcelSide} /><div className={s.parcelFront}><span className={s.parcelTape} /><span className={s.parcelEyes}><i /><i /></span><span className={s.parcelSmile} /><span className={s.parcelLabel}><img src="/gridstock-mark.svg" width="18" height="18" alt="" /></span></div></div>
    <span className={s.parcelSpark}>✦</span>
  </div>;
}

const faqs = [
  ['O GridStock pode ser configurado para minha empresa?', 'Sim. Na apresentação, entendemos sua rotina e configuramos os módulos de equipe em campo, saídas e transferências, além dos limites de usuários e estoques. O ambiente também pode receber o nome, a cor e a mensagem de boas-vindas da sua empresa.'],
  ['Para quem é o GridStock?', 'Para empresas que precisam organizar materiais em almoxarifados e acompanhar peças com equipes externas, como operações de instalação, manutenção e assistência técnica. Também há configurações para comércio e estoque geral. Na conversa, entendemos o que faz sentido para a sua operação.'],
  ['Como posso conhecer o sistema?', 'Clique em “Quero uma demonstração” para falar pelo WhatsApp. Conte como funciona seu estoque e conheça os recursos e as condições de contratação. A liberação do ambiente é combinada com a nossa equipe.'],
  ['O técnico consegue usar pelo celular?', 'Sim. O portal do técnico é acessado pelo navegador do celular, com conexão à internet. Nele, o profissional consulta os materiais sob sua responsabilidade e registra retiradas, utilizações e devoluções.'],
  ['Consigo controlar mais de um almoxarifado?', 'Sim. Você pode organizar bases, identificar produtos por corredor e prateleira e registrar transferências entre almoxarifados. Os módulos e limites de acesso são definidos na configuração da sua empresa.'],
  ['Como funciona a localização do material utilizado?', 'Ao registrar a utilização, o técnico pode permitir o acesso à localização do dispositivo. As coordenadas ficam vinculadas à movimentação e podem ser consultadas no mapa. Se o GPS não estiver disponível, o local pode ser informado manualmente. Não é rastreamento contínuo do técnico.'],
  ['Quanto custa e como funciona a contratação?', 'Converse com a nossa equipe pelo WhatsApp para conhecer as condições de acesso, os módulos e os limites adequados à sua empresa. A contratação e a liberação do ambiente são feitas com atendimento direto.'],
];

export default function LandingPage() {
  return <div className={s.page} id="inicio">
    <a className={s.skipLink} href="#conteudo">Pular para o conteúdo</a>
    <LandingHeader />
    <main id="conteudo">
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroGrid} aria-hidden="true" />
        <div className={s.heroIntro}>
          <span className={s.eyebrow}><span className={s.liveDot} /> GESTÃO DE ESTOQUE, DA BASE AO CAMPO</span>
          <h1 id="hero-title">Saiba onde está<br />cada peça.<br /><span>Assuma o controle.</span></h1>
          <p className={s.heroDescription}>Chega de depender de mensagens para descobrir um saldo. Organize seus estoques, acompanhe os materiais com a equipe e consulte cada movimentação em um só lugar.</p>
          <div className={s.heroActions}><ContactLink /><a className={s.secondaryButton} href="#demonstracao"><span className={s.playIcon}><svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path d="M4 2.5 13 8 4 13.5Z" fill="currentColor" /></svg></span> Explorar o sistema</a></div>
          <p className={s.microcopy}><Icon name="check" /> Atendimento direto pelo WhatsApp. Vamos entender sua operação.</p>
        </div>
        <aside className={s.journeyBoard} aria-label="Exemplo de acompanhamento de material">
          <div className={s.journeyTop}><span><Icon name="arrows" /> CADA MOVIMENTO CONTA</span><span className={s.sampleTag}>Exemplo ilustrativo</span></div>
          <h2>A peça sai.<br />O controle fica.</h2>
          <div className={s.journeyItem}><span className={s.journeyBox}><Icon name="box" /></span><div><small>MATERIAL EM MOVIMENTO</small><strong>Conector óptico</strong><span>Base central → Equipe de instalação</span></div></div>
          <div className={s.journeySteps}>
            {[['box','12','Retiradas'],['pin','8','Utilizadas'],['reset','4','Devolvidas']].map(([icon,qty,label],index) => <div key={label}><span className={s.journeyNode}><Icon name={icon} /></span><strong>{qty}<small> un.</small></strong><span>{label}</span><small>0{index + 1}</small></div>)}
          </div>
          <div className={s.journeyResult}><span><Icon name="check" /></span><div><strong>Do primeiro registro à conferência.</strong><p>Quantidade, responsável e destino no histórico.</p></div></div>
        </aside>
        <div className={s.heroCapabilities} aria-label="Recursos da plataforma"><span><Icon name="box" /> Saldo por localização</span><span><Icon name="users" /> Responsável por cada peça</span><span><Icon name="arrows" /> Histórico para conferir</span></div>
        <div className={s.heroProduct} id="demonstracao">
          <div className={s.demoIntro}><div><span className={s.eyebrow}>VEJA ANTES DE CONVERSAR</span><h2>Seu próximo jeito<br />de cuidar do estoque.</h2></div><p>Explore a visão geral, a equipe e as movimentações. Os dados são ilustrativos; a rotina é a que você conhece.</p></div>
          <ProductPreview mascot={<Parcel />} />
        </div>
        <div className={s.audienceStrip}><span>FEITO PARA QUEM COLOCA A OPERAÇÃO EM MOVIMENTO</span><div><span><Icon name="tool" /> Manutenção</span><span><Icon name="route" /> Instalação</span><span><Icon name="users" /> Assistência técnica</span><span><Icon name="box" /> Comércio e estoques</span></div></div>
      </section>

      <section className={`${s.section} ${s.fitSection}`} id="sua-operacao" aria-labelledby="fit-title">
        <div className={s.sectionHeading}><span className={s.eyebrow}>FEITO PARA A SUA ROTINA</span><h2 id="fit-title">Seu negócio tem um jeito.<br />Seu sistema acompanha.</h2><p>Selecione o que você precisa organizar e veja como o GRIDSTOCK pode ajudar.</p></div>
        <OperationFit />
      </section>

      <section className={`${s.section} ${s.problemSection}`} id="por-que-gridstock">
        <Reveal><div className={s.sectionHeading}><span className={s.eyebrow}>MENOS PROCURA. MAIS CLAREZA.</span><h2>Troque perguntas repetidas<br />por respostas na tela.</h2><p>Informação organizada para decidir a próxima retirada, reposição ou conferência.</p></div></Reveal>
        <div className={s.problemGrid}>
          {[['box', '“Ainda tem na base?”', 'Consulte o saldo e o endereço de cada item, sem depender de uma ida ao almoxarifado.'], ['users', '“Quem ficou com essa peça?”', 'Veja os materiais sob responsabilidade de cada técnico, mesmo depois da retirada.'], ['pin', '“Onde esse material foi usado?”', 'Consulte a utilização registrada, o responsável e o local informado no atendimento.']].map(([icon, title, text], i) => <Reveal key={title} delay={i * 80}><article className={s.problemCard}><span className={s.iconTile}><Icon name={icon} /></span><h3>{title}</h3><p>{text}</p><span className={s.cardIndex}>0{i + 1}</span></article></Reveal>)}
        </div>
      </section>

      <section className={s.workflowSection} id="como-funciona">
        <div className={s.section}>
          <Reveal><div className={s.sectionHeading}><span className={s.eyebrow}>DA PRATELEIRA AO ATENDIMENTO</span><h2>O caminho da peça.<br /><span>Sem perder o fio.</span></h2><p>Um fluxo conectado para a operação e para quem está na rua.</p></div></Reveal>
          <Reveal><Workflow /></Reveal>
        </div>
      </section>

      <section className={s.section} id="recursos">
        <Reveal><div className={`${s.sectionHeading} ${s.leftHeading}`}><div><span className={s.eyebrow}>MENOS DÚVIDA. MAIS VISIBILIDADE.</span><h2>Cada ponta da operação.<br />No mesmo lugar.</h2></div><p>O detalhe que o técnico registra vira informação para quem cuida do estoque.</p></div></Reveal>
        <div className={s.featureGrid}>
          <Reveal className={s.featureWide}><article className={`${s.featureCard} ${s.stockFeature}`}><div className={s.featureCopy}><span className={s.featureLabel}><Icon name="box" /> ALMOXARIFADOS</span><h3>Um lugar para cada peça.<br />Um saldo para cada base.</h3><p>Organize por corredor e prateleira. Consulte saldos e registre transferências entre suas unidades.</p></div><div className={s.shelfIllustration} aria-hidden="true"><div className={s.shelfTopline}><span>Base central</span><span>A · 03</span></div><div className={s.shelf}><i /><i /><i /><i /><i /><i /></div><div className={s.shelfPill}><Icon name="pin" /> Corredor A <span>→</span> Prateleira 03 <Icon name="check" /></div></div></article></Reveal>
          <Reveal><article className={`${s.featureCard} ${s.alertFeature}`}><span className={s.featureLabel}><Icon name="bell" /> REPOSIÇÃO</span><h3>Olhe para o que<br />precisa de atenção.</h3><p>Identifique os produtos que atingiram o estoque mínimo cadastrado.</p><div className={s.restockCard}><span className={s.warningIcon}><Icon name="alert" /></span><div><strong>Conector óptico</strong><span>Abaixo do mínimo</span></div><strong>8 <small>un.</small></strong></div><div className={s.restockTrack}><i /></div><div className={s.restockLegend}><span>Saldo atual: 8</span><span>Mínimo: 20</span></div><small className={s.exampleLabel}>Exemplo ilustrativo</small></article></Reveal>
          <Reveal><article className={`${s.featureCard} ${s.historyFeature}`}><span className={s.featureLabel}><Icon name="arrows" /> RASTREABILIDADE</span><h3>Uma movimentação.<br />Todos os detalhes.</h3><p>Consulte retiradas, utilizações e devoluções, com responsável e histórico para conferência.</p><div className={s.miniTimeline}>{[['Retirada na base', '08:15', 'box'], ['Utilização registrada', '10:42', 'pin'], ['Devolução de sobras', '17:30', 'reset']].map(([title, time, icon]) => <div key={title}><span><Icon name={icon} /></span><strong>{title}</strong><small>{time}</small></div>)}</div><small className={s.exampleLabel}>Fluxo ilustrativo</small></article></Reveal>
          <Reveal className={s.featureWide}><article className={`${s.featureCard} ${s.mobileFeature}`}><div className={s.featureCopy}><span className={s.featureLabel}><Icon name="van" /> EQUIPE EM CAMPO</span><h3>O estoque do técnico.<br />Na palma da mão.</h3><p>Um portal no navegador do celular para consultar a carga e registrar o uso das peças durante o atendimento.</p><span className={s.inlineCheck}><Icon name="check" /> Acesso individual por CPF e senha</span></div><div className={s.phone}><div className={s.phoneCamera} /><div className={s.phoneTop}><img src="/gridstock-mark.svg" alt="" width="24" height="24" /><span>Portal do técnico</span></div><small>EXEMPLO ILUSTRATIVO</small><h4>Pronto para a rota.</h4><div className={s.phoneStock}><span>Meu estoque</span><strong>24 <small>peças</small></strong><span>3 produtos na sua carga</span></div><div className={s.phoneItem}><Icon name="box" /><div><strong>Conector óptico</strong><small>12 unidades</small></div><Icon name="chevron" /></div><div className={s.phoneAction}><Icon name="check" /> Registrar utilização</div><div className={s.phoneLocation}><Icon name="pin" /> Local vinculado ao registro*</div></div></article></Reveal>
        </div>
        <p className={s.featureFootnote}>* A captura de GPS depende da permissão e da disponibilidade de localização no dispositivo. O local também pode ser informado manualmente.</p>
      </section>

      <section className={`${s.section} ${s.startSection}`} id="comecar">
        <Reveal><div className={s.sectionHeading}><span className={s.eyebrow}>SEU PRÓXIMO PASSO</span><h2>Começa com uma conversa.<br />Continua na sua operação.</h2><p>Conte como você trabalha. A gente apresenta o GridStock e combina os próximos passos para o seu acesso.</p></div></Reveal>
        <div className={s.startGrid}>{[['01', 'Chame no WhatsApp', 'Conte sobre a sua empresa, seus almoxarifados e a rotina da equipe.'], ['02', 'Conheça o sistema', 'Converse sobre os recursos, as condições e a configuração para a sua operação.'], ['03', 'Receba seu acesso', 'Com o ambiente liberado, entre com CPF e senha e organize os cadastros da empresa.']].map(([number, title, text]) => <Reveal key={number}><div className={s.startStep}><span>{number}</span><h3>{title}</h3><p>{text}</p></div></Reveal>)}</div>
        <ContactLink>Agendar uma demonstração</ContactLink>
      </section>

      <section className={`${s.section} ${s.faqSection}`} id="duvidas">
        <Reveal><div className={s.faqIntro}><span className={s.eyebrow}>VAMOS ESCLARECER</span><h2>Ficou alguma<br />peça faltando?</h2><p>Aqui estão as respostas para começar com clareza.</p><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={s.textLink}>Fale com a nossa equipe <Icon name="arrow" /></a></div></Reveal>
        <div className={s.faqList}>{faqs.map(([question, answer], i) => <details key={question} className={s.faqItem} name="gridstock-faq"><summary><span className={s.faqNumber}>0{i + 1}</span><span>{question}</span><span className={s.faqPlus} aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className={s.finalSection}><Reveal><div className={s.finalCard}><div className={s.finalGrid} aria-hidden="true" /><div className={s.finalCopy}><span className={s.eyebrow}>CADA PEÇA NO SEU RADAR.</span><h2>O próximo movimento<br />é da sua empresa.</h2><p>Veja como organizar seus materiais e acompanhar sua operação com o GRIDSTOCK.</p><ContactLink light>Agendar uma demonstração</ContactLink><span className={s.finalMicrocopy}>Conheça os recursos. Tire suas dúvidas. Avalie com a sua equipe.</span></div><div className={s.finalParcel}><span className={s.parcelSpeech}>Vamos organizar? <Icon name="check" /></span><Parcel /></div></div></Reveal></section>
    </main>
    <footer className={s.footer}><div className={s.footerTop}><div><Link href="/" aria-label="GridStock, início"><Brand /></Link><p>Estoque em movimento.<br />Controle em cada etapa.</p></div><nav aria-label="Navegação do rodapé"><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><a href="#duvidas">Dúvidas</a><Link href="/login">Entrar no sistema <Icon name="arrow" /></Link></nav></div><div className={s.footerBottom}><span>© {new Date().getFullYear()} GridStock.</span><LegalFooterLinks /></div></footer>
  </div>;
}
