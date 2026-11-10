package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sezzle-calculator/backend/internal/api"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

// newHandler returns the API and, when staticDir is set, the built frontend too.
func newHandler(staticDir string) http.Handler {
	apiHandler := api.NewRouter()
	if staticDir == "" {
		return apiHandler
	}

	mux := http.NewServeMux()
	mux.Handle("/health", apiHandler)
	mux.Handle("/api/", apiHandler)
	mux.Handle("/", http.FileServer(http.Dir(staticDir)))
	return mux
}

func run() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	staticDir := os.Getenv("STATIC_DIR")
	if staticDir != "" {
		log.Printf("serving frontend from %s", staticDir)
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           newHandler(staticDir),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}

	// Cancel ctx on Ctrl+C or SIGTERM (what `docker stop` sends).
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		log.Printf("listening on :%s", port)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		return err // the server failed to start, e.g. port already in use
	case <-ctx.Done():
		log.Println("shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
