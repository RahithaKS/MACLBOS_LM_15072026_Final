import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollText } from 'lucide-react';

const SESSION_KEY = 'ledgerlm_terms_accepted_session';

export function TermsAndConditionsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show once per browser session — sessionStorage is cleared on tab/browser close
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      {/* onOpenChange is a no-op: user must click the button to close */}
      <DialogContent
        className="max-w-[580px] w-full p-0 gap-0 overflow-hidden rounded-2xl"
        // Remove the default X close button from DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 pt-8 pb-4 px-8">
          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
            <ScrollText className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center">
            Terms and Conditions for LedgerLM
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            Version 1.0 &nbsp;|&nbsp; Effective Date: July 15, 2026
            <br />
            Issued by: BGSW (Bosch Global Software Technologies)
          </p>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[52vh] px-8 pb-2 text-sm text-foreground space-y-4">
          <Section title="1. Introduction and Acceptance of Terms">
            <p>1.1 These Terms and Conditions ("Terms") govern access to and use of the LedgerLM ("Application"), an AI-enabled Chat for analyzing and generating financial data. It is developed and operated by BGSW (Bosch Global Software Technologies).</p>
            <p>1.2 By accessing, registering for, or using the Application, you ("User," "you," or "your") agree to be bound by these Terms in full. If you do not agree to these Terms, you must immediately discontinue use of the Application.</p>
            <p>1.3 These Terms apply to all users of the Application, including employees, contractors, interns, and any other personnel authorized by BGSW to access the Application.</p>
            <p>1.4 These Terms are to be read in conjunction with BGSW's applicable internal policies, including but not limited to the Data Protection Policy, IT Acceptable Use Policy, and AI Governance Framework, where applicable.</p>
          </Section>

          <Section title="2. Eligibility and Access">
            <p>2.1 The Application is available exclusively to individuals who are employed by or affiliated with BGSW and have been granted access credentials by the Company.</p>
            <p>2.2 Access to the Application is non-transferable. Users must not share login credentials or grant access to the Application to unauthorized individuals.</p>
            <p>2.3 BGSW reserves the right to revoke or suspend access to any User at any time, with or without notice, in the event of a suspected breach of these Terms or any applicable Company policy.</p>
            <p>2.4 Users are responsible for maintaining the confidentiality of their access credentials and for any activity occurring under their accounts.</p>
          </Section>

          <Section title="3. Permitted Use of the Application">
            <p>3.1 Users are permitted to use the Application solely for analysing and understanding financial data.</p>
            <p>3.2 Users must use the Application in good faith, providing accurate information to enable meaningful and accurate AI-generated Outputs.</p>
            <p>3.3 Users must not use the Application for any purpose other than for the activities mentioned above in section 3.1.</p>
            <p>3.4 The Application is intended to be used only internally and use for any purpose outside the scope described above will require prior written approval by BGSW.</p>
          </Section>

          <Section title="4. Prohibited Use">
            <p>4.1 Users are strictly prohibited from:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Using the Application for personal, commercial, or any non-enterprise purposes;</li>
              <li>Attempting to reverse-engineer, decompile, disassemble, or otherwise derive the source code or underlying AI models of the Application;</li>
              <li>Attempting to access, probe, or test the security of the Application's infrastructure without prior written authorization from BGSW;</li>
              <li>Inputting confidential, proprietary, or personally sensitive third-party information into the Application that is not necessary for generating required financial data;</li>
              <li>Manipulating, circumventing, or interfering with the Application's AI Components, recommendation engines, or content delivery mechanisms;</li>
              <li>Using the Application to generate content for distribution outside of the BGSW enterprise environment without prior written authorization;</li>
              <li>Uploading, transmitting, or introducing any malicious code, virus, or disruptive data into the Application;</li>
              <li>Attempting to extract, copy, or reproduce the financial data in bulk or in a manner that infringes intellectual property rights;</li>
              <li>Impersonating another User or providing false information to obtain financial data.</li>
            </ul>
          </Section>

          <Section title="5. AI-Generated Outputs and Limitations">
            <p>5.1 The Application uses AI and large language model technologies to generate Outputs based on User inputs and underlying financial data.</p>
            <p>5.2 AI-generated Outputs are provided for informational purposes only and do not constitute financial advice, legal advice, or any other form of professional guidance.</p>
            <p>5.3 BGSW does not guarantee the accuracy, completeness, or fitness for purpose of any AI-generated Output. Users must independently verify all Outputs before relying on them for any decision-making purposes.</p>
            <p>5.4 Users acknowledge that AI systems may produce errors, inconsistencies, or outputs that do not reflect current financial data, and accept responsibility for the application of any Output.</p>
          </Section>

          <Section title="6. Data Privacy and Security">
            <p>6.1 BGSW is committed to protecting User data in accordance with applicable data protection laws and BGSW's internal Data Protection Policy.</p>
            <p>6.2 Users must not input personally identifiable information (PII) or sensitive personal data into the Application unless expressly authorized to do so under BGSW's data handling procedures.</p>
            <p>6.3 All data processed through the Application is subject to BGSW's data governance policies. Users must comply with any applicable data minimisation, retention, and deletion requirements.</p>
            <p>6.4 Users must immediately report any suspected data breach, unauthorized access, or security incident relating to the Application to BGSW's IT Security Team.</p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>7.1 All intellectual property rights in the Application, including its software, AI models, design, and content, are owned by or licensed to BGSW.</p>
            <p>7.2 Users are granted a limited, non-exclusive, non-transferable license to use the Application solely for the purposes described in these Terms.</p>
            <p>7.3 Users must not reproduce, distribute, modify, or create derivative works of any part of the Application without prior written consent from BGSW.</p>
          </Section>

          <Section title="8. Confidentiality">
            <p>8.1 Users must treat all information accessed through the Application as confidential and proprietary to BGSW.</p>
            <p>8.2 Users must not disclose, share, or distribute any financial data, reports, or outputs generated by the Application to any third party without prior written authorization from BGSW.</p>
            <p>8.3 Confidentiality obligations survive the termination of the User's access to the Application.</p>
          </Section>

          <Section title="9. System Integrity and Security Compliance">
            <p>9.1 Users must comply with all applicable BGSW IT security policies and procedures when accessing the Application.</p>
            <p>9.2 Users must not attempt to circumvent, disable, or interfere with any security features, access controls, or monitoring systems within the Application.</p>
            <p>9.3 Users must access the Application only through authorized and BGSW-approved devices and networks.</p>
          </Section>

          <Section title="10. Monitoring and Audit">
            <p>10.1 BGSW reserves the right to monitor, log, and audit User activity within the Application for the purposes of security, compliance, and performance management.</p>
            <p>10.2 By using the Application, Users consent to such monitoring and acknowledge that any misuse detected may result in disciplinary action.</p>
          </Section>

          <Section title="11. Liability and Indemnification">
            <p>11.1 Limitation of Liability. To the fullest extent permitted by law, BGSW shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from the use of or inability to use the Application.</p>
            <p>11.2 BGSW does not warrant that the Application will be error-free, uninterrupted, or free from harmful components.</p>
            <p>11.3 BGSW's total liability to any User in connection with these Terms shall not exceed the value of the User's internal cost allocation for use of the Application in the preceding three months, or such other amount as permitted by law.</p>
            <p>11.4 Indemnification. Users agree to indemnify and hold harmless BGSW, its officers, employees, and agents from and against any claims, losses, damages, liabilities, or expenses arising from the User's breach of these Terms.</p>
          </Section>

          <Section title="12. Modifications to the Terms">
            <p>12.1 BGSW reserves the right to amend or update these Terms at any time. Material changes will be communicated to Users via the Application interface or by email to the registered enterprise email address.</p>
            <p>12.2 Continued use of the Application following notification of changes constitutes acceptance of the revised Terms.</p>
            <p>12.3 The version number and effective date at the top of these Terms indicate the most current version.</p>
          </Section>

          <Section title="13. Suspension and Termination">
            <p>13.1 BGSW may suspend or terminate a User's access to the Application immediately and without prior notice if the User breaches any provision of these Terms, the User's employment or affiliation with BGSW is terminated, BGSW reasonably suspects unauthorized, fraudulent, or abusive use of the Application, or as required by law or applicable regulatory authority.</p>
            <p>13.2 Upon termination of access, the User must immediately cease all use of the Application and must not attempt to circumvent access restrictions.</p>
            <p>13.3 Provisions that by their nature should survive termination shall continue to apply following termination.</p>
          </Section>

          <Section title="14. Governing Law and Dispute Resolution">
            <p>14.1 These Terms shall be governed by and construed in accordance with the laws of India and the courts of Bengaluru shall have the exclusive jurisdiction.</p>
            <p>14.2 Any disputes arising out of or in connection with these Terms shall first be submitted to internal dispute resolution through BGSW's HR and Legal departments. Where internal resolution is not achieved, disputes shall be referred to arbitration.</p>
          </Section>

          <Section title="15. Ethical Use of AI">
            <p>15.1 Users must engage with the Application's AI Components in a responsible, ethical, and professional manner, consistent with BGSW's AI Ethics Guidelines and applicable regulatory standards.</p>
            <p>15.2 Users must not attempt to manipulate, deceive, or exploit the Application's AI Components to generate outputs that are discriminatory, harmful, misleading, or in violation of applicable laws or BGSW policies.</p>
            <p>15.3 Users are encouraged to provide feedback on AI-generated Outputs that appear inaccurate, biased, or inappropriate, using the feedback mechanisms provided within the Application.</p>
          </Section>

          <Section title="16. Contact and Reporting">
            <p>For questions, concerns, or reports relating to these Terms or the Application, please contact:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>LedgerLM Application Support Team: <span className="font-medium">bgsw-assistant.bosch.tech</span></li>
              <li>Data Protection Officer: <span className="font-medium">DPO.India@in.bosch.com</span></li>
              <li>IT Security Team: <span className="font-medium">RBEI.ProVIRT@bcn.bosch.com</span></li>
            </ul>
          </Section>

          <Section title="17. Severability">
            <p>If any provision of these Terms is found to be invalid, unlawful, or unenforceable under applicable law, such provision shall be deemed modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.</p>
          </Section>

          <Section title="18. Entire Agreement">
            <p>These Terms, together with any applicable BGSW policies referenced herein, constitute the entire agreement between BGSW and the User with respect to the use of the Application and supersede all prior agreements, understandings, and representations.</p>
            <p className="mt-2 font-medium">By accessing or using the LedgerLM Application, you acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions.</p>
          </Section>
        </div>

        {/* Accept button */}
        <div className="px-8 py-5 border-t bg-background">
          <Button
            onClick={handleAccept}
            className="w-full h-11 text-base font-medium rounded-lg"
          >
            I Understand &amp; Accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Small helper for section headings + body
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <div className="space-y-1.5 text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
