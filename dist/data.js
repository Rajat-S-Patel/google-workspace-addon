"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSheetIdCard = exports.getWelcomeCard = exports.card = void 0;
const lodash_1 = require("lodash");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const CLIENT_URL = process.env.CLIENT_URL;
const card = {
    header: {
        title: "Oreka RMS",
        subtitle: "Spreadsheet Data",
        imageUrl: `${CLIENT_URL}/oreka-logo-50.png`,
        imageType: "SQUARE",
        imageAltText: "Oreka-Logo",
    },
    sections: [
        {
            widgets: [
                {
                    textParagraph: {
                        text: "Welcome to Oreka RMS",
                    },
                },
                {
                    textInput: {
                        name: "username",
                        label: "Username",
                    },
                },
                {
                    textInput: {
                        name: "password",
                        label: "Password",
                        type: "SINGLE_LINE",
                    },
                },
                {
                    textInput: {
                        name: "spreadsheetId",
                        label: "SpreadSheet Id",
                    },
                },
                {
                    buttonList: {
                        buttons: [
                            {
                                text: "Sign In",
                                onClick: {
                                    action: {
                                        function: `${CLIENT_URL}/signIn`,
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        },
    ],
    cardActions: [
        {
            actionLabel: "View Details",
            onClick: {
                action: {
                    function: "handleCardAction",
                },
            },
        },
    ],
    name: "Home Card",
};
exports.card = card;
const welcomeCard = {
    renderActions: {
        action: {
            navigations: [
                {
                    pushCard: {
                        header: {
                            title: "Welcome",
                        },
                        sections: [
                            {
                                widgets: [
                                    {
                                        textParagraph: {
                                            text: "You have successfully signed in!",
                                        },
                                    },
                                    {
                                        textInput: {
                                            name: "spreadsheetId",
                                            label: "SpreadSheet Id",
                                            value: "",
                                            type: "SINGLE_LINE",
                                        },
                                    },
                                    {
                                        textInput: {
                                            name: "sheetId",
                                            label: "sheet gid",
                                        },
                                    },
                                    {
                                        buttonList: {
                                            buttons: [
                                                {
                                                    text: "Submit",
                                                    onClick: {
                                                        action: {
                                                            function: `${CLIENT_URL}/submit-gid`,
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        ],
                        cardActions: [
                            {
                                actionLabel: "View Details",
                                onClick: {
                                    action: {
                                        function: "handleCardAction",
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        },
    },
    stateChanged: true,
};
const linkCard = {
    renderActions: {
        action: {
            navigations: [
                {
                    pushCard: {
                        header: {
                            title: "Configure",
                        },
                        sections: [
                            {
                                widgets: [
                                    {
                                        textParagraph: {
                                            text: "Configure Sheet",
                                        },
                                    },
                                    {
                                        buttonList: {
                                            buttons: [
                                                {
                                                    text: "Click to configure",
                                                    onClick: {
                                                        openLink: {
                                                            url: undefined,
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        ],
                        cardActions: [
                            {
                                actionLabel: "View Details",
                                onClick: {
                                    action: {
                                        function: "handleCardAction",
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        },
    },
    stateChanged: true,
};
function getWelcomeCard(spreadSheetId) {
    const newCard = (0, lodash_1.cloneDeep)(welcomeCard);
    newCard.renderActions.action.navigations[0].pushCard.sections[0].widgets[1].textInput.value = `${spreadSheetId}`;
    return newCard;
}
exports.getWelcomeCard = getWelcomeCard;
function getSheetIdCard(spreadSheetId, sheetId) {
    const newCard = (0, lodash_1.cloneDeep)(linkCard);
    const orekaUrl = process.env.OREKA_URL;
    newCard.renderActions.action.navigations[0].pushCard.sections[0].widgets[1].buttonList.buttons[0].onClick.openLink.url = `${orekaUrl}/addon-configure/${spreadSheetId}?sheetId=${sheetId}`;
    return newCard;
}
exports.getSheetIdCard = getSheetIdCard;
