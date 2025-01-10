import { Fragment } from 'react';

const Component = () => (
    <Fragment>
        {
            // Empty expression should not fail
        }
        <Fragment>
            <Trans count={10} ns="dev">
                Hello <strong>World</strong>, you have {{count}} unread message.
            </Trans>
            <Trans count={10} ns={`dev`}>
                Hello <strong>World</strong>, you have {{count}} unread message.
            </Trans>
        </Fragment>
        <Fragment>
            <Trans i18nKey="jsx-quotes-double">Use double quotes for the i18nKey attribute</Trans>
            <Trans i18nKey='jsx-quotes-single'>Use single quote for the i18nKey attribute</Trans>
            <Trans i18nKey="html-encoded-tags" shouldUnescape>&lt; &amp; &gt;</Trans>
            <Trans i18nKey="plural" count={count}>You have {{count}} apples</Trans>
            <Trans i18nKey="context" tOptions={{ context: 'male' }}>A boyfriend</Trans>
            <Trans i18nKey="context" tOptions={{ context: `male` }}>A boyfriend</Trans>
        </Fragment>
        <Fragment>
            <Trans i18nKey="multiline-text-string">
                multiline
                text
                string
            </Trans>
            <Trans i18nKey="string-literal">This is a <strong>test</strong></Trans>
            <Trans i18nKey="object-expression">This is a <strong>{{test}}</strong></Trans>
            <Trans i18nKey="object-expression-with-format">Interpolation + custom formatter Trans <strong>{{test, format: 'currency(.00/w)'}}</strong></Trans>
            <Trans i18nKey="arithmetic-expression">
                2 + 2 = {{ result: 2 + 2 }}
            </Trans>
            <Trans i18nKey="components">
                Go to <Anchor href="/administration/tools">Administration &gt; Tools</Anchor> to download administrative tools.
            </Trans>
            <Trans i18nKey="lorem-ipsum">
                <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                <p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>
            </Trans>
            <Trans i18nKey="lorem-ipsum-nested">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                <p>
                    Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                    <p>
                        {'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'}
                    </p>
                </p>
                <p>
                    Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
                </p>
            </Trans>
        </Fragment>
        <Fragment>
            <Trans>Hello, World!</Trans>
            <Trans>
                multiline
                text
                string
            </Trans>
            <Trans>This is a <strong>test</strong></Trans>
            <Trans>This is a <strong>{{test}}</strong></Trans>
            <Trans>
                2 + 2 = {{ result: 2 + 2 }}
            </Trans>
            <Trans>
                Go to <Anchor href="/administration/tools">Administration &gt; Tools</Anchor> to download administrative tools.
            </Trans>
            <Trans>
                <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                <p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>
            </Trans>
            <Trans>
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                <p>
                    Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                    <p>
                        {'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'}
                    </p>
                </p>
                <p>
                    Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
                </p>
            </Trans>
        </Fragment>
        <Fragment>
            <Trans defaults="The component might be self-closing" />
            <Trans defaults="Some <0>{variable}</0>" />
            <Trans defaults="Hello <1>{{planet}}</1>!" tOptions={{planet: "World"}} components={[<strong>stuff</strong>]} />
        </Fragment>
        <Fragment>
            <Component
                render={(
                    <Trans>translation from props</Trans>
                )}
            />
            <Component
                render={(
                    <Component
                        render={(
                            <Trans>translation from nested props</Trans>
                        )}
                    />
                )}
            />
            <Component
                render={(
                    <Component
                        render={(
                            <Component
                                render={(
                                    <Component
                                        render={(
                                            <Trans>translation from deeply nested props</Trans>
                                        )}
                                    />
                                )}
                            />
                        )}
                    />
                )}
            />
            <Tooltip
                content={(
                    <TooltipTextContainer>
                        <Trans i18nKey="tooltip1" parent={'span'} i18n={i18n} t={t}>
                            Some tooltip text
                        </Trans>
                    </TooltipTextContainer>
                )}
            >
                <InfoIconStyled />
            </Tooltip>
            <Tooltip
                content={(
                    <TooltipTextContainer>
                        <AnotherContainer>
                            <Trans i18nKey="tooltip2" parent={'span'} i18n={i18n} t={t}>
                                Some tooltip text
                            </Trans>
                        </AnotherContainer>
                    </TooltipTextContainer>
                )}
            >
                <InfoStyleIcon />
            </Tooltip>
        </Fragment>
        <Fragment>
            <I18n __t="mykey">A wrapper component with key</I18n>
            <I18n>A wrapper component without key</I18n>
        </Fragment>
    </Fragment>
);

export default Component;
