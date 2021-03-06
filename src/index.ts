import dotenv from "dotenv";
import { Twilio } from "twilio";
import { ConversationInstance } from "twilio/lib/rest/conversations/v1/conversation";
import { ParticipantInstance } from "twilio/lib/rest/conversations/v1/conversation/participant";
import {
  addSMSParticipantToConversation,
  createConversation,
  listConversations,
  listConversationParticipants,
  siccParticipants,
  sendCryptoAlert,
} from "./twilio/twilio";

const debug = false;

debug ? console.log(dotenv.config()) : dotenv.config();

const accountSid: string | null = process.env.TWILIO_ACCOUNT_SID as string;
const authToken: string | null = process.env.TWILIO_AUTH_TOKEN as string;
const twilioNumber: string | null = process.env.TWILIO_PHONE_NUMBER as string;

const participantsNames: string | null = process.env
  .SICC_PARTICIPANTS_NAMES as string; // -- must be comma separated of participant names

const participantsNumbers: string | null = process.env
  .SICC_PARTICIPANTS as string; // -- must be comma separated of participant phone numbers in e.164 format

const messari_api_key: string = process.env.MESSARI_API_KEY as string;

// conversation name we are looking for -- will be created if not found
const friendly_name = "Sicc Crypto Alerts";
const unique_name = "Sicc Crypto Alerts";

if (require.main === module) {
  if (
    accountSid &&
    authToken &&
    twilioNumber &&
    participantsNames &&
    participantsNumbers &&
    messari_api_key
  ) {
    const client = new Twilio(accountSid, authToken);

    // get the participtans from environment variables (participantsNames and participantsNumbers)
    // debug -- list the participants from environment variables
    const siccPartipantsMap: Map<string, string> = siccParticipants(
      participantsNumbers,
      participantsNames,
      true
    );

    // debug -- list all current conversations in instantiated Twilio client
    listConversations(client, true)
      .then((conversations: void | Array<ConversationInstance>) => {
        if (!conversations) {
          throw new Error("Conversations object is null");
        }

        // find the conversation with specified friendly_name and return conversation object
        for (
          let i = 0;
          i < (conversations as Array<ConversationInstance>).length;
          ++i
        ) {
          if (conversations[i].friendlyName === friendly_name) {
            console.log(conversations[i]);
            return conversations[i];
          }
        }

        // create a conversation with specified friendly_name if not found and return newly created conversation object
        return createConversation(client, friendly_name, unique_name).then(
          (conversation: void | ConversationInstance) => {
            // console.log((conversation as ConversationInstance).sid);
            return conversation as ConversationInstance;
          }
        );
      })
      .then((conversation) => {
        if (!conversation) {
          throw new Error("Conversation object is null");
        }

        // grab the SID of the conversation -- will be used heavily from here on out
        const conversationSID: string | undefined = conversation?.sid as string;

        // list all participants in the conversation SID
        return listConversationParticipants(client, conversationSID)
          .then((participants) => {
            const phoneNumbers: Array<string> = participantsNumbers.split(",");

            // list out current participtants in conversations SID
            console.log("Current conversation participants:");
            const conversationParticipantNumbers = new Array<string>();
            for (
              let i = 0;
              i < (participants as Array<ParticipantInstance>).length;
              ++i
            ) {
              const phoneNumber = participants[i].messagingBinding?.address;

              conversationParticipantNumbers.push(phoneNumber);
              console.log(
                phoneNumber,
                "=>",
                siccPartipantsMap.get(phoneNumber) ?? participants[i].identity
              );
            }

            // check if participantsNumbers env var is in current participtants in conversations SID
            // if not, add them to the current conversations SID
            const promises = new Array<Promise<any>>();
            for (let i = 0; i < phoneNumbers.length; ++i) {
              if (!conversationParticipantNumbers.includes(phoneNumbers[i])) {
                promises.push(
                  addSMSParticipantToConversation(
                    client,
                    conversationSID,
                    phoneNumbers[i],
                    twilioNumber
                  )
                    .then((participant: ParticipantInstance | void) => {
                      console.log(
                        `Sucessfully added participant ${
                          (participant as ParticipantInstance).messagingBinding
                            ?.address
                        } to SID ${conversationSID}`
                      );
                    })
                    .catch((err) => {
                      console.error(err);
                      process.exit(1);
                    })
                );
              }
            }
            return Promise.all(promises);
          })
          .then((_: Array<any>) => {
            console.log("Participant list updated.");
            return sendCryptoAlert(client, messari_api_key, conversationSID);
          });
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    console.error(
      "You are missing one of the variables you need to send a message"
    );
  }
}
